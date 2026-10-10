package com.example.demo.carr.service;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.carr.dto.CarrDtos.AuditResponse;
import com.example.demo.carr.dto.CarrTaskDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.entity.CarrResponsibility.TaskStatus;
import com.example.demo.carr.repository.*;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;

/** Task operations on existing CARR responsibilities; existing approval and KPI records stay intact. */
@Service @RequiredArgsConstructor
public class CarrTaskService {
    private final CarrResponsibilityRepository tasks;
    private final CarrRecordRepository records;
    private final CarrAuditEventRepository history;
    private final EmployeeRepository employees;
    private final CompanyRepository companies;
    private final CarrTaskAttachmentRepository attachments;
    private final CarrTaskNotifier notifications;
    private final com.example.demo.common.service.FileUploadService files;
    private final com.example.demo.employee.service.ReportingManagerService reportingManagers;
    private final com.fasterxml.jackson.databind.ObjectMapper json;

    private Long companyId() {
        var scope = AccessScopeContext.get();
        Long id = CompanyContext.get();
        if (id == null || scope == null || !scope.canAccess(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Select an accessible company before using tasks");
        return id;
    }
    private boolean administrator(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> Set.of("ROLE_PLATFORM_SUPER_ADMIN", "ROLE_ENTERPRISE_ADMIN",
                "ROLE_BRANCH_ADMIN", "ROLE_HR_MANAGER").contains(a.getAuthority()));
    }
    private boolean manager(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> Set.of("ROLE_MANAGER", "ROLE_DEPARTMENT_MANAGER", "ROLE_TEAM_LEAD").contains(a.getAuthority()));
    }
    private Long userId(Authentication auth) { return ((UserPrincipal) auth.getPrincipal()).getId(); }
    private boolean owns(Employee employee, Authentication auth) {
        return employee.getUser() != null && Objects.equals(employee.getUser().getId(), userId(auth));
    }
    private boolean manages(Employee employee, Authentication auth) {
        if (administrator(auth)) return true;
        Employee supervisor = reportingManagers.resolve(employee);
        if (supervisor != null && supervisor.isActive() && owns(supervisor, auth)
                && Objects.equals(supervisor.getCompany().getId(), companyId())) return true;
        if (!manager(auth)) return false;
        var scope = AccessScopeContext.get();
        return (scope != null && scope.getDepartmentId() != null && employee.getDepartment() != null
                && Objects.equals(scope.getDepartmentId(), employee.getDepartment().getId()));
    }
    private boolean visible(CarrResponsibility task, Authentication auth) {
        return task.getAccountableEmployee() != null && (owns(task.getAccountableEmployee(), auth) || manages(task.getAccountableEmployee(), auth));
    }
    private Employee assignee(Long id, Long departmentId, Authentication auth) {
        Employee employee = employees.findById(id).filter(e -> e.isActive() && e.getCompany() != null
                && Objects.equals(e.getCompany().getId(), companyId())).orElseThrow(() -> new ResourceNotFoundException("Employee", id));
        if (!manages(employee, auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot assign tasks to this employee");
        if (departmentId != null && (employee.getDepartment() == null || !Objects.equals(employee.getDepartment().getId(), departmentId)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee does not belong to the selected department");
        return employee;
    }
    private CarrResponsibility require(Long id, Authentication auth) {
        Long company = companyId();
        return tasks.findById(id).filter(t -> t.isActive() && t.getCarr().isActive() && Objects.equals(t.getCarr().getCompany().getId(), company)
                && t.getCarr().getStatus() != CarrStatus.ARCHIVED && visible(t, auth))
                .orElseThrow(() -> new ResourceNotFoundException("CARR task", id));
    }
    @Transactional(readOnly=true)
    public List<TaskResponse> list(Authentication auth) {
        return list(auth, false);
    }
    @Transactional(readOnly=true)
    public List<TaskResponse> list(Authentication auth, boolean mine) {
        return tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(companyId()).stream()
                .filter(t -> t.getCarr().isActive() && t.getCarr().getStatus() != CarrStatus.ARCHIVED && visible(t, auth)
                        && (!mine || owns(t.getAccountableEmployee(), auth))).map(t -> dto(t, auth)).toList();
    }
    @Transactional(readOnly=true)
    public TaskOptions options(Authentication auth) {
        var available = employees.findByCompanyIdInAndIsActiveTrue(List.of(companyId())).stream().filter(e -> manages(e, auth)).toList();
        var departments = new TreeMap<Long, DepartmentOption>();
        available.forEach(e -> { if(e.getDepartment()!=null) departments.put(e.getDepartment().getId(), new DepartmentOption(e.getDepartment().getId(), e.getDepartment().getName())); });
        return new TaskOptions(available.stream().map(e -> new EmployeeOption(e.getId(), name(e), e.getDepartment()==null?null:e.getDepartment().getId())).toList(),
                List.copyOf(departments.values()), administrator(auth) || manager(auth) || !available.isEmpty(),
                companies.findByIdPublic(companyId()).orElseThrow().getName());
    }
    @Transactional
    public TaskResponse create(TaskRequest request, Authentication auth) {
        if (!Set.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD).contains(request.status()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Create a task before submitting or completing it");
        Employee employee = assignee(request.employeeId(), request.departmentId(), auth);
        CarrRecord record = new CarrRecord();
        record.setCompany(companies.findByIdPublic(companyId()).orElseThrow()); record.setEmployee(employee);
        record.setManager(reportingManagers.resolve(employee)); record.setTitle(request.title().trim()); record.setPurpose(request.description());
        record.setTaskRecord(true);
        records.save(record);
        CarrResponsibility task = new CarrResponsibility(); task.setCarr(record); task.setAccountableEmployee(employee);
        task.setRequiresReview(request.requiresReview() == null || request.requiresReview());
        assignment(task, auth);
        apply(task, request); tasks.save(task); audit(task, "TASK_CREATED", "Task assigned to " + name(employee), auth);
        notifications.employee(task, "Task assigned", task.getStatement() + " was assigned to you");
        return dto(task, auth);
    }
    @Transactional
    public TaskResponse update(Long id, TaskRequest request, Authentication auth) {
        CarrResponsibility task = require(id, auth);
        if (!manages(task.getAccountableEmployee(), auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the task manager can edit or reassign this task");
        if (task.getTaskStatus() == TaskStatus.COMPLETED || task.getTaskStatus() == TaskStatus.READY_FOR_REVIEW)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Review submitted work before changing task details");
        Employee employee = assignee(request.employeeId(), request.departmentId(), auth);
        Long previous = task.getAccountableEmployee().getId();
        if (task.getTaskStatus() != request.status() || task.getProgress() != request.progress())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use the work update action to change progress or status");
        task.setAccountableEmployee(employee); apply(task, request);
        if (!Objects.equals(previous, employee.getId())) {
            task.setTaskStatus(TaskStatus.TODO); task.setProgress(0); task.setWorkDetails(null); task.setBlockerReason(null);
            task.setActualCompletionDate(null); task.setSubmittedAt(null); task.setCompletedAt(null); task.setReviewFeedback(null);
            saveChecklist(task,checklist(task).stream().map(item->new ChecklistItem(item.id(),item.label(),false,null,null)).toList());
            assignment(task, auth);
        }
        // Only standalone tasks own their wrapper record; preserve legacy role records.
        if (task.getCarr().isTaskRecord()) {
            task.getCarr().setEmployee(employee);
            task.getCarr().setManager(reportingManagers.resolve(employee));
            task.getCarr().setTitle(request.title().trim());
            task.getCarr().setPurpose(request.description());
        }
        tasks.save(task); audit(task, "TASK_UPDATED", "Assigned employee " + previous + " -> " + employee.getId() + "; title " + task.getStatement() + "; priority " + task.getPriority() + "; due " + task.getDueDate() + "; instructions " + Objects.toString(task.getInstructions(), "") + "; deliverables " + Objects.toString(task.getRequiredDeliverables(), ""), auth);
        notifications.employee(task, "Task updated", task.getStatement() + ": assignment, instructions or deadline changed");
        return dto(task, auth);
    }
    @Transactional
    public TaskResponse details(Long id, DetailsRequest request, Authentication auth) {
        CarrResponsibility task = require(id, auth);
        if (Set.of(TaskStatus.COMPLETED, TaskStatus.READY_FOR_REVIEW, TaskStatus.CANCELLED).contains(task.getTaskStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task details cannot change while awaiting review or after completion or cancellation");
        task.setStatement(request.title().trim());
        task.setDescription(request.description());
        task.setDueDate(request.dueDate());
        if (task.getCarr().isTaskRecord()) {
            task.getCarr().setTitle(task.getStatement());
            task.getCarr().setPurpose(task.getDescription());
        }
        tasks.save(task);
        audit(task, "TASK_UPDATED", "Title " + task.getStatement() + "; description " + Objects.toString(task.getDescription(), "") + "; due " + task.getDueDate(), auth);
        return dto(task, auth);
    }
    @Transactional
    public TaskResponse progress(Long id, ProgressRequest request, Authentication auth) {
        CarrResponsibility task = require(id, auth);
        if (task.getTaskStatus() == TaskStatus.CANCELLED && !manages(task.getAccountableEmployee(), auth))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only the task manager can reopen a cancelled task");
        if (request.status() == TaskStatus.CANCELLED && !manages(task.getAccountableEmployee(), auth))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the task manager can cancel a task");
        String previous = task.getTaskStatus() + " " + task.getProgress() + "%";
        transition(task, request, auth); tasks.save(task);
        audit(task, "TASK_PROGRESS", previous + " -> " + task.getTaskStatus() + " " + task.getProgress() + "%" + (request.comment()==null?"":"; " + request.comment())
                + "; work: " + Objects.toString(task.getWorkDetails(), "") + "; blocker: " + Objects.toString(task.getBlockerReason(), "") + "; completion date: " + task.getActualCompletionDate(), auth);
        if (task.getTaskStatus() == TaskStatus.READY_FOR_REVIEW) notifications.manager(task, "Task ready for review", task.getStatement() + ": work submitted for approval");
        if (task.getTaskStatus() == TaskStatus.BLOCKED) notifications.manager(task, "Task blocked", task.getStatement() + ": " + task.getBlockerReason());
        if (task.getTaskStatus() == TaskStatus.COMPLETED) notifications.manager(task, "Task completed", task.getStatement() + " is complete");
        return dto(task, auth);
    }
    @Transactional(readOnly=true)
    public List<AuditResponse> activity(Long id, Authentication auth) {
        CarrResponsibility task = require(id, auth);
        return history.findByCarrIdOrderByCreatedAtDesc(task.getCarr().getId()).stream()
                .filter(a -> a.getDetails()!=null && a.getDetails().startsWith("Task #" + id + ": "))
                .map(a -> new AuditResponse(a.getId(), a.getAction(), a.getActorUserId(), a.getActorEmail(), a.getDetails(), a.getCreatedAt())).toList();
    }
    @Transactional
    public void remindDeadlines(LocalDate today) {
        for(var task: tasks.findByDueDateLessThanEqualAndIsActiveTrue(today.plusDays(2))) {
            if(!task.getCarr().isActive() || !task.getCarr().getCompany().isActive() || task.getCarr().getStatus()==CarrStatus.ARCHIVED
                    || task.getAccountableEmployee()==null || !task.getAccountableEmployee().isActive()
                    || Set.of(TaskStatus.COMPLETED,TaskStatus.CANCELLED).contains(task.getTaskStatus())) continue;
            String kind=task.getDueDate().isBefore(today)?"OVERDUE":"DUE_SOON";
            if(Objects.equals(task.getDeadlineNoticeDate(),task.getDueDate()) && kind.equals(task.getDeadlineNoticeKind())) continue;
            notifications.employee(task,kind.equals("OVERDUE")?"Task overdue":"Task deadline approaching",task.getStatement()+" is due "+task.getDueDate());
            if(kind.equals("OVERDUE")) notifications.manager(task,"Task overdue",task.getStatement()+" missed its deadline "+task.getDueDate());
            task.setDeadlineNoticeDate(task.getDueDate());task.setDeadlineNoticeKind(kind);tasks.save(task);
            CarrAuditEvent event=new CarrAuditEvent();event.setCarr(task.getCarr());event.setAction("TASK_DEADLINE");event.setActorUserId(0L);event.setActorEmail("System");
            event.setDetails("Task #"+task.getId()+": "+kind+" "+task.getDueDate());history.save(event);
        }
    }
    private void assignment(CarrResponsibility task, Authentication auth) {
        task.setAssignedByUserId(userId(auth)); task.setAssignedByName(auth.getName()); task.setAssignedAt(java.time.LocalDateTime.now());
        Employee supervisor = reportingManagers.resolve(task.getAccountableEmployee());
        task.setReviewerUserId(owns(task.getAccountableEmployee(), auth)
                ? (supervisor == null || supervisor.getUser() == null ? null : supervisor.getUser().getId()) : userId(auth));
    }
    private boolean evidenceRequired(CarrResponsibility task) {
        return task.isRequiresEvidence() || (task.getEvidenceRequired()!=null && !task.getEvidenceRequired().isBlank());
    }
    private void submission(CarrResponsibility task, String work, LocalDate completed) {
        if(checklist(task).stream().anyMatch(item->!item.completed()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Complete all checklist steps before submitting work");
        if (work == null || work.isBlank() || completed == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide completed work details and the actual completion date");
        if (completed.isAfter(LocalDate.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completion date cannot be in the future");
        var user = task.getAccountableEmployee().getUser();
        if (evidenceRequired(task) && (user == null || !attachments.existsByTaskIdAndUploadedByUserIdAndKindAndIsActiveTrue(task.getId(), user.getId(), CarrTaskAttachment.Kind.DELIVERABLE)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload the required deliverable before submitting work");
    }
    private void transition(CarrResponsibility task, ProgressRequest request, Authentication auth) {
        TaskStatus from=task.getTaskStatus(), to=request.status();
        if (from==TaskStatus.COMPLETED || from==TaskStatus.READY_FOR_REVIEW)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Submitted work must be reviewed before it can be changed");
        if (to==TaskStatus.READY_FOR_REVIEW && !owns(task.getAccountableEmployee(),auth))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned employee can submit work");
        if (to==TaskStatus.COMPLETED && task.isRequiresReview())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Submit work for manager approval before completion");
        Set<TaskStatus> allowed = switch(from) {
            case TODO -> Set.of(TaskStatus.TODO,TaskStatus.IN_PROGRESS,TaskStatus.BLOCKED,TaskStatus.ON_HOLD,TaskStatus.CANCELLED);
            case IN_PROGRESS -> Set.of(TaskStatus.IN_PROGRESS,TaskStatus.TODO,TaskStatus.BLOCKED,TaskStatus.ON_HOLD,TaskStatus.READY_FOR_REVIEW,TaskStatus.COMPLETED,TaskStatus.CANCELLED);
            case BLOCKED -> Set.of(TaskStatus.BLOCKED,TaskStatus.IN_PROGRESS,TaskStatus.ON_HOLD,TaskStatus.CANCELLED);
            case ON_HOLD -> Set.of(TaskStatus.ON_HOLD,TaskStatus.IN_PROGRESS,TaskStatus.TODO,TaskStatus.CANCELLED);
            case CANCELLED -> Set.of(TaskStatus.TODO);
            default -> Set.of();
        };
        boolean legacyCompletion=from==TaskStatus.TODO && to==TaskStatus.COMPLETED && !task.isRequiresReview() && !evidenceRequired(task);
        if (!allowed.contains(to) && !legacyCompletion) throw new ResponseStatusException(HttpStatus.CONFLICT, "Start or resume work before submitting it");
        if (to==TaskStatus.BLOCKED && (request.blockerReason()==null || request.blockerReason().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Describe the blocker before marking work blocked");
        String work=request.workDetails()==null?task.getWorkDetails():request.workDetails();
        LocalDate date=request.actualCompletionDate()==null?task.getActualCompletionDate():request.actualCompletionDate();
        if (date!=null && date.isAfter(LocalDate.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Completion date cannot be in the future");
        if (to==TaskStatus.READY_FOR_REVIEW || (to==TaskStatus.COMPLETED && (evidenceRequired(task) || !checklist(task).isEmpty()))) submission(task,work,date);
        task.setWorkDetails(work); task.setActualCompletionDate(date); task.setBlockerReason(to==TaskStatus.BLOCKED?request.blockerReason():null);
        setProgress(task,to,request.progress());
        if (to==TaskStatus.READY_FOR_REVIEW) task.setSubmittedAt(java.time.LocalDateTime.now());
        if (to==TaskStatus.COMPLETED) { task.setCompletedAt(java.time.LocalDateTime.now()); if(date==null)task.setActualCompletionDate(LocalDate.now()); }
    }
    @Transactional(readOnly=true)
    public TaskDetail detail(Long id, Authentication auth) {
        var task=require(id,auth);
        return new TaskDetail(dto(task,auth),attachments.findByTaskIdAndIsActiveTrueOrderByCreatedAtDesc(id).stream().map(this::attachmentDto).toList(),activity(id,auth));
    }
    @Transactional
    public TaskDetail comment(Long id, CommentRequest request, Authentication auth) {
        var task=require(id,auth); audit(task,"TASK_COMMENT",request.comment(),auth);
        if(owns(task.getAccountableEmployee(),auth)) notifications.manager(task,"Task comment",task.getStatement()+": "+request.comment());
        else notifications.employee(task,"Task comment",task.getStatement()+": "+request.comment());
        return detail(id,auth);
    }
    @Transactional
    public TaskResponse review(Long id, ReviewRequest request, Authentication auth) {
        var task=require(id,auth);
        if(!manages(task.getAccountableEmployee(),auth) || owns(task.getAccountableEmployee(),auth))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"A task manager must review the employee's work");
        if(task.getTaskStatus()!=TaskStatus.READY_FOR_REVIEW) throw new ResponseStatusException(HttpStatus.CONFLICT,"This task has not been submitted for review");
        if(!request.approved() && (request.comment()==null || request.comment().isBlank())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Explain the corrections required");
        if(request.approved()) submission(task,task.getWorkDetails(),task.getActualCompletionDate());
        task.setReviewFeedback(request.comment()); task.setTaskStatus(request.approved()?TaskStatus.COMPLETED:TaskStatus.IN_PROGRESS);
        task.setProgress(request.approved()?100:Math.min(99,task.getProgress())); task.setCompletedAt(request.approved()?java.time.LocalDateTime.now():null);
        tasks.save(task); audit(task,request.approved()?"TASK_APPROVED":"TASK_CORRECTIONS",Objects.toString(request.comment(),"Work approved"),auth);
        notifications.employee(task,request.approved()?"Task completed":"Task corrections requested",task.getStatement()+": "+Objects.toString(request.comment(),"Approved"));
        return dto(task,auth);
    }
    @Transactional
    public AttachmentResponse upload(Long id, org.springframework.web.multipart.MultipartFile file, CarrTaskAttachment.Kind kind, Authentication auth) {
        var task=require(id,auth);
        if((kind==CarrTaskAttachment.Kind.INSTRUCTION && !manages(task.getAccountableEmployee(),auth))
                || (kind==CarrTaskAttachment.Kind.DELIVERABLE && !owns(task.getAccountableEmployee(),auth)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You cannot upload this type of task file");
        if(Set.of(TaskStatus.COMPLETED,TaskStatus.CANCELLED,TaskStatus.READY_FOR_REVIEW).contains(task.getTaskStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Files cannot be changed while work is submitted or closed");
        String filename=file.getOriginalFilename();
        if(file.isEmpty() || file.getSize()>20*1024*1024 || filename==null || filename.length()>180 || filename.contains("..") || filename.matches(".*[\\\\/:\\x00].*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a non-empty file up to 20 MB with a safe filename");
        String path=files.store(file,"carr-private/"+TenantContext.getTenant().replaceAll("[^a-zA-Z0-9_-]","_")+"/"+id);
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if(status!=STATUS_COMMITTED) files.delete(path); }
        });
        var attachment=new CarrTaskAttachment(); attachment.setTask(task);attachment.setFilename(filename);attachment.setFileSize(file.getSize());
        attachment.setKind(kind);attachment.setUploadedByUserId(userId(auth));attachment.setStoragePath(path); attachments.save(attachment);
        audit(task,"TASK_ATTACHMENT",kind+": "+filename,auth); return attachmentDto(attachment);
    }
    @Transactional(readOnly=true)
    public CarrTaskAttachment attachment(Long id, Long attachmentId, Authentication auth) {
        require(id,auth);
        return attachments.findById(attachmentId).filter(a->a.isActive() && Objects.equals(a.getTask().getId(),id))
                .orElseThrow(()->new ResourceNotFoundException("Task file",attachmentId));
    }
    private AttachmentResponse attachmentDto(CarrTaskAttachment a) { return new AttachmentResponse(a.getId(),a.getFilename(),a.getFileSize(),a.getKind().name(),a.getUploadedByUserId(),a.getCreatedAt()); }
    private void apply(CarrResponsibility task, TaskRequest request) {
        applyMetadata(task,request);
        setProgress(task, request.status(), request.progress());
    }
    private List<ChecklistItem> checklist(CarrResponsibility task) {
        try { return json.readValue(Objects.toString(task.getChecklistItems(),"[]"),new com.fasterxml.jackson.core.type.TypeReference<List<ChecklistItem>>(){}); }
        catch(com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalStateException("Invalid saved task checklist",ex); }
    }
    private void saveChecklist(CarrResponsibility task,List<ChecklistItem> items) {
        try {task.setChecklistItems(json.writeValueAsString(items));}
        catch(com.fasterxml.jackson.core.JsonProcessingException ex) {throw new IllegalStateException("Cannot save task checklist",ex);}
    }
    @Transactional
    public TaskResponse checklist(Long id,String itemId,ChecklistRequest request,Authentication auth) {
        var task=require(id,auth);
        if(!owns(task.getAccountableEmployee(),auth)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the assigned employee can complete checklist steps");
        if(Set.of(TaskStatus.COMPLETED,TaskStatus.CANCELLED,TaskStatus.READY_FOR_REVIEW).contains(task.getTaskStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Checklist cannot change while work is submitted or closed");
        var current=checklist(task);
        var selected=current.stream().filter(item->item.id().equals(itemId)).findFirst().orElseThrow(()->new ResourceNotFoundException("Checklist item not found"));
        if(selected.completed()==request.completed()) return dto(task,auth);
        saveChecklist(task,current.stream().map(item->item.id().equals(itemId)?new ChecklistItem(item.id(),item.label(),request.completed(),request.completed()?userId(auth):null,request.completed()?java.time.LocalDateTime.now():null):item).toList());
        tasks.save(task);audit(task,"TASK_CHECKLIST",selected.label()+": "+(request.completed()?"completed":"reopened"),auth);
        return dto(task,auth);
    }
    private void applyMetadata(CarrResponsibility task, TaskRequest request) {
        task.setStatement(request.title().trim()); task.setDescription(request.description());
        task.setPriority(request.priority()==null?"MEDIUM":request.priority());
        if (!Objects.equals(task.getDueDate(), request.dueDate())) { task.setDeadlineNoticeDate(null); task.setDeadlineNoticeKind(null); }
        task.setDueDate(request.dueDate());
        if (request.instructions() != null) task.setInstructions(request.instructions());
        if (request.requiredDeliverables() != null) task.setRequiredDeliverables(request.requiredDeliverables());
        if (request.requiresReview() != null) task.setRequiresReview(request.requiresReview());
        if (request.requiresEvidence() != null) task.setRequiresEvidence(request.requiresEvidence());
        if(request.checklist()!=null) {
            if(request.checklist().stream().map(String::trim).distinct().count()!=request.checklist().size())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Checklist steps must be distinct");
            var existing=new HashMap<String,ChecklistItem>();checklist(task).forEach(item->existing.put(item.label(),item));
            saveChecklist(task,request.checklist().stream().map(String::trim).map(label->existing.getOrDefault(label,new ChecklistItem(UUID.randomUUID().toString(),label,false,null,null))).toList());
        }
    }
    private void setProgress(CarrResponsibility task, TaskStatus status, int progress) {
        if (status == TaskStatus.TODO && progress != 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "To do tasks must have zero progress");
        if (status != TaskStatus.COMPLETED && status != TaskStatus.READY_FOR_REVIEW && progress == 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submit completed work for review when progress reaches 100%");
        task.setTaskStatus(status); task.setProgress(status == TaskStatus.COMPLETED || status == TaskStatus.READY_FOR_REVIEW ?100:progress);
    }
    private void audit(CarrResponsibility task, String action, String details, Authentication auth) {
        CarrAuditEvent event = new CarrAuditEvent(); event.setCarr(task.getCarr()); event.setAction(action);
        event.setActorUserId(userId(auth)); event.setActorEmail(((UserPrincipal)auth.getPrincipal()).getEmail());
        event.setDetails("Task #" + task.getId() + ": " + details); history.save(event);
    }
    private String name(Employee employee) { return (Objects.toString(employee.getFirstName(), "") + " " + Objects.toString(employee.getLastName(), "")).trim(); }
    private TaskResponse dto(CarrResponsibility task, Authentication auth) {
        Employee employee = task.getAccountableEmployee(); var department = employee.getDepartment(); var company = task.getCarr().getCompany();
        boolean overdue = task.getDueDate()!=null && task.getDueDate().isBefore(LocalDate.now())
                && task.getTaskStatus()!=TaskStatus.COMPLETED && task.getTaskStatus()!=TaskStatus.CANCELLED;
        return new TaskResponse(task.getId(), task.getCarr().getId(), task.getStatement(), task.getDescription(), company.getId(), company.getName(),
                department==null?null:department.getId(), department==null?null:department.getName(), employee.getId(), name(employee),
                task.getPriority(), task.getDueDate(), task.getTaskStatus(), task.getProgress(), overdue,
                manages(employee, auth) && task.getTaskStatus()!=TaskStatus.COMPLETED && task.getTaskStatus()!=TaskStatus.READY_FOR_REVIEW,
                visible(task, auth) && task.getTaskStatus()!=TaskStatus.COMPLETED && task.getTaskStatus()!=TaskStatus.READY_FOR_REVIEW && (task.getTaskStatus()!=TaskStatus.CANCELLED || manages(employee, auth)), task.getUpdatedAt(),
                task.getInstructions(), task.getRequiredDeliverables(), task.isRequiresReview(), evidenceRequired(task),
                task.getAssignedByUserId(), task.getAssignedByName(), task.getReviewerUserId(), task.getAssignedAt(),
                task.getWorkDetails(), task.getBlockerReason(), task.getReviewFeedback(), task.getActualCompletionDate(),
                task.getSubmittedAt(), task.getCompletedAt(), owns(employee, auth) && !Set.of(TaskStatus.COMPLETED,TaskStatus.CANCELLED,TaskStatus.READY_FOR_REVIEW).contains(task.getTaskStatus()),
                manages(employee, auth) && !owns(employee,auth) && task.getTaskStatus()==TaskStatus.READY_FOR_REVIEW, task.getCreatedAt(),checklist(task),
                Objects.equals(task.getReviewerUserId(),task.getAssignedByUserId()) ? task.getAssignedByName()
                        : task.getCarr().getManager()==null?null:name(task.getCarr().getManager()));
    }
}
