package com.example.demo.onboarding.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.onboarding.entity.*;
import com.example.demo.onboarding.repository.*;
import com.example.demo.recruitment.entity.Candidate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final EmailService emailService;
    private final com.example.demo.recruitment.repository.ApplicantRepository applicantRepository;
    private final com.example.demo.employee.service.EmployeeService employeeService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    private void access(Long companyId) { com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(companyId); }
    private com.example.demo.employee.entity.Employee scopedEmployee(Long id) {
        var employee=employeeRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("Employee",id));access(employee.getCompany().getId());return employee;
    }
    private void assignTemplateTasks(OnboardingCandidate candidate) {
        for(var template:taskRepository.findByCompanyId(candidate.getPortal().getCompany().getId())) {
            var row=new CandidateTask();row.setOnboardingCandidate(candidate);row.setTitle(template.getTitle());row.setDescription(template.getDescription());row.setIsCompleted(false);
            if(template.getDaysToComplete()!=null) row.setDueDate(LocalDate.now().plusDays(template.getDaysToComplete()));candidateTaskRepository.save(row);
        }
    }
    private void editable(OnboardingCandidate candidate) {
        access(candidate.getPortal().getCompany().getId());
        if(candidate.getStatus()!=OnboardingCandidate.OnboardingStatus.IN_PROGRESS) throw new com.example.demo.common.exception.BadRequestException("Completed or cancelled onboarding cannot be changed");
    }
    private void checklist(OnboardingCandidate candidate) {
        var existing=candidateStageRepository.findByOnboardingCandidateId(candidate.getId());
        for(var stage:stageRepository.findByPortalIdOrderBySequenceAsc(candidate.getPortal().getId())) {
            if(existing.stream().noneMatch(row->row.getStage().getId().equals(stage.getId()))) {var row=new CandidateStage();row.setOnboardingCandidate(candidate);row.setStage(stage);candidateStageRepository.save(row);}
        }
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> eligibleCandidates(Long portalId) {
        var portal=getPortalById(portalId);
        var used=onboardingCandidateRepository.findByPortalId(portalId).stream().map(c->c.getCandidate().getId()).collect(java.util.stream.Collectors.toSet());
        return applicantRepository.findByCompanyId(portal.getCompany().getId()).stream().filter(a->a.getStatus()==com.example.demo.recruitment.entity.Applicant.ApplicantStatus.HIRED && !used.contains(a.getCandidate().getId()) && onboardingCandidateRepository.findByCandidateId(a.getCandidate().getId()).isEmpty())
          .map(a->Map.<String,Object>of("id",a.getCandidate().getId(),"name",a.getCandidate().getName(),"email",a.getCandidate().getEmail()==null?"":a.getCandidate().getEmail())).distinct().toList();
    }
    @Transactional
    public Map<String,Object> convertCandidate(Long id,com.example.demo.onboarding.dto.OnboardingConversionRequest form) {
        var oc=getCandidateById(id);entityManager.flush();entityManager.lock(oc,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);entityManager.refresh(oc);
        access(oc.getPortal().getCompany().getId());
        if(oc.getStatus()!=OnboardingCandidate.OnboardingStatus.COMPLETED) throw new com.example.demo.common.exception.BadRequestException("Complete the onboarding checklist before converting to an employee");
        var candidate=oc.getCandidate();Long companyId=oc.getPortal().getCompany().getId();
        entityManager.lock(candidate,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);entityManager.refresh(candidate);
        if(candidate.getEmployeeId()!=null) return Map.of("employeeId",candidate.getEmployeeId(),"message","Employee already linked");
        if(candidate.getEmail()==null || candidate.getEmail().isBlank()) throw new com.example.demo.common.exception.BadRequestException("Candidate email is required");
        jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?,0))","onboarding-employee:"+companyId+":"+candidate.getEmail().strip().toLowerCase(java.util.Locale.ROOT));
        if(entityManager.createQuery("select count(e) from Employee e where lower(trim(e.email))=:email",Long.class).setParameter("email",candidate.getEmail().strip().toLowerCase(java.util.Locale.ROOT)).getSingleResult()>0) throw new com.example.demo.common.exception.BadRequestException("An employee with this email already exists. Use existing-employee onboarding instead of creating a duplicate");
        var req=new com.example.demo.employee.dto.EmployeeRequest();String[] names=candidate.getName().strip().split("\\s+",2);
        req.setFirstName(names[0]);req.setLastName(names.length>1?names[1]:"");req.setEmail(candidate.getEmail());req.setPhone(candidate.getMobile());req.setCompanyId(companyId);
        req.setDateJoining(form.getDateJoining());req.setDepartmentId(form.getDepartmentId());req.setJobPositionId(form.getJobPositionId());req.setJobRoleId(form.getJobRoleId());req.setShiftId(form.getShiftId());req.setReportingManagerId(form.getReportingManagerId());
        req.setRole(com.example.demo.auth.entity.Role.RoleName.EMPLOYEE);req.setAccessScope(com.example.demo.auth.entity.UserRole.AccessScope.SELF);
        req.setPassword(java.util.UUID.randomUUID().toString()+java.util.UUID.randomUUID());req.setIsActive(true);
        var employee=employeeService.createWithinCurrentTransaction(req);candidate.setEmployeeId(employee.getId());entityManager.flush();
        return Map.of("employeeId",employee.getId(),"message","Employee created with self-service access; use password reset to set the login password");
    }
    private final OnboardingTaskRepository taskRepository;
    private final EmployeeOnboardingRepository employeeOnboardingRepository;
    private final OnboardingPortalRepository portalRepository;
    private final OnboardingStageRepository stageRepository;
    private final OnboardingCandidateRepository onboardingCandidateRepository;
    private final CandidateStageRepository candidateStageRepository;
    private final CandidateTaskRepository candidateTaskRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── OnboardingTask CRUD ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingTask> listTasks() {
        Specification<OnboardingTask> spec = ScopeFilter.byCompany();
        return spec != null ? taskRepository.findAll(spec) : taskRepository.findAll();
    }

    @Transactional(readOnly = true)
    public OnboardingTask getTaskById(Long id) {
        var task=taskRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("OnboardingTask",id));access(task.getCompany().getId());return task;
    }

    @Transactional
    public OnboardingTask createTask(OnboardingTask task) {
        Long companyId=com.example.demo.common.context.CompanyContext.get();if(companyId==null) throw new com.example.demo.common.exception.BadRequestException("Select a company");access(companyId);task.setCompany(companyRepository.getReferenceById(companyId));task.setId(null);
        log.info("Creating onboarding task: {}", task.getTitle());
        return taskRepository.save(task);
    }

    @Transactional
    public OnboardingTask updateTask(Long id, OnboardingTask updated) {
        OnboardingTask task = getTaskById(id);
        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        task.setDaysToComplete(updated.getDaysToComplete());
        log.info("Updating onboarding task id={}", id);
        return taskRepository.save(task);
    }

    @Transactional
    public Map<String, String> deleteTask(Long id) {
        getTaskById(id);
        if (!taskRepository.existsById(id)) {
            throw new ResourceNotFoundException("OnboardingTask", id);
        }
        taskRepository.deleteById(id);
        log.info("Deleted onboarding task id={}", id);
        return Map.of("message", "OnboardingTask deleted");
    }

    // ─── EmployeeOnboarding CRUD ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeOnboarding> getEmployeeOnboarding(Long employeeId) {
        scopedEmployee(employeeId);return employeeOnboardingRepository.findByEmployeeId(employeeId);
    }

    @Transactional(readOnly = true)
    public EmployeeOnboarding getEmployeeOnboardingById(Long id) {
        var row=employeeOnboardingRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("EmployeeOnboarding",id));scopedEmployee(row.getEmployee().getId());return row;
    }

    @Transactional
    public EmployeeOnboarding createEmployeeOnboarding(EmployeeOnboarding row) {
        if(row.getEmployee()==null || row.getTask()==null) throw new com.example.demo.common.exception.BadRequestException("Employee and task are required");
        var employee=scopedEmployee(row.getEmployee().getId());var task=getTaskById(row.getTask().getId());
        if(!employee.getCompany().getId().equals(task.getCompany().getId())) throw new com.example.demo.common.exception.BadRequestException("Task belongs to another company");
        row.setId(null);row.setEmployee(employee);row.setTask(task);row.setStatus(EmployeeOnboarding.OnboardingStatus.PENDING);row.setCompletedDate(null);return employeeOnboardingRepository.save(row);
    }

    @Transactional
    public EmployeeOnboarding completeEmployeeOnboarding(Long id) {
        EmployeeOnboarding eo = getEmployeeOnboardingById(id);
        eo.setStatus(EmployeeOnboarding.OnboardingStatus.COMPLETED);
        eo.setCompletedDate(LocalDate.now());
        log.info("Marking EmployeeOnboarding id={} as COMPLETED", id);
        return employeeOnboardingRepository.save(eo);
    }

    // ─── OnboardingPortal CRUD ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingPortal> listPortals() {
        Specification<OnboardingPortal> spec = ScopeFilter.byCompany();
        return spec != null ? portalRepository.findAll(spec) : portalRepository.findAll();
    }

    @Transactional(readOnly = true)
    public OnboardingPortal getPortalById(Long id) {
        var portal=portalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("OnboardingPortal",id));
        if(portal.getCompany()==null) throw new com.example.demo.common.exception.BadRequestException("Portal must belong to a company");access(portal.getCompany().getId());return portal;
    }

    @Transactional
    public OnboardingPortal createPortal(OnboardingPortal portal) {
        Long companyId=com.example.demo.common.context.CompanyContext.get();
        if(companyId==null) throw new com.example.demo.common.exception.BadRequestException("Select a company before creating an onboarding portal");access(companyId);
        if(portal.getTitle()==null || portal.getTitle().isBlank()) throw new com.example.demo.common.exception.BadRequestException("Portal title is required");
        portal.setId(null);portal.setCompany(companyRepository.getReferenceById(companyId));
        log.info("Creating onboarding portal: {}", portal.getTitle());
        return portalRepository.save(portal);
    }

    @Transactional
    public OnboardingPortal updatePortal(Long id, OnboardingPortal updated) {
        OnboardingPortal portal = getPortalById(id);
        portal.setTitle(updated.getTitle());
        portal.setIsActive(updated.getIsActive());
        portal.setExpiresAt(updated.getExpiresAt());
        return portalRepository.save(portal);
    }

    @Transactional
    public void deletePortal(Long id) {
        getPortalById(id);
        if(!onboardingCandidateRepository.findByPortalId(id).isEmpty() || !stageRepository.findByPortalIdOrderBySequenceAsc(id).isEmpty()) throw new com.example.demo.common.exception.BadRequestException("Portal has onboarding records or stages; deactivate it to preserve history");
        if (!portalRepository.existsById(id)) {
            throw new ResourceNotFoundException("OnboardingPortal", id);
        }
        portalRepository.deleteById(id);
        log.info("Deleted onboarding portal id={}", id);
    }

    // ─── OnboardingStage CRUD ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingStage> listStages(Long portalId) {
        getPortalById(portalId);return stageRepository.findByPortalIdOrderBySequenceAsc(portalId);
    }

    @Transactional(readOnly = true)
    public OnboardingStage getStageById(Long id) {
        var stage=stageRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("OnboardingStage",id));getPortalById(stage.getPortal().getId());return stage;
    }

    @Transactional
    public OnboardingStage createStage(Long portalId, OnboardingStage stage) {
        stage.setId(null);stage.setPortal(getPortalById(portalId));
        var saved=stageRepository.save(stage);
        for(var candidate:onboardingCandidateRepository.findByPortalId(saved.getPortal().getId())) if(candidate.getStatus()==OnboardingCandidate.OnboardingStatus.IN_PROGRESS) checklist(candidate);
        return saved;
    }

    @Transactional
    public OnboardingStage updateStage(Long id, OnboardingStage updated) {
        OnboardingStage stage = getStageById(id);
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    @Transactional
    public Map<String, String> deleteStage(Long id) {
        getStageById(id);
        if(!candidateStageRepository.findByStageId(id).isEmpty() || !candidateTaskRepository.findByStageId(id).isEmpty()) throw new com.example.demo.common.exception.BadRequestException("This stage is already part of an onboarding checklist");
        if (!stageRepository.existsById(id)) {
            throw new ResourceNotFoundException("OnboardingStage", id);
        }
        stageRepository.deleteById(id);
        return Map.of("message", "Stage deleted");
    }

    // ─── OnboardingCandidate CRUD ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingCandidate> listCandidates(Long portalId) {
        getPortalById(portalId);var rows=onboardingCandidateRepository.findByPortalId(portalId);rows.forEach(row->org.hibernate.Hibernate.initialize(row.getCandidate()));return rows;
    }

    @Transactional(readOnly = true)
    public OnboardingCandidate getCandidateById(Long id) {
        var candidate=onboardingCandidateRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate",id));
        access(candidate.getPortal().getCompany().getId());org.hibernate.Hibernate.initialize(candidate.getCandidate());return candidate;
    }

    @Transactional
    public OnboardingCandidate addCandidate(Long portalId, OnboardingCandidate oc) {
        var portal=getPortalById(portalId);entityManager.lock(portal,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(!Boolean.TRUE.equals(portal.getIsActive()) || portal.getExpiresAt()!=null && portal.getExpiresAt().isBefore(LocalDate.now())) throw new com.example.demo.common.exception.BadRequestException("Portal is inactive or expired");
        if(oc.getCandidate()==null || oc.getCandidate().getId()==null) throw new com.example.demo.common.exception.BadRequestException("Select a hired candidate");
        Long candidateId=oc.getCandidate().getId();
        var applicant=applicantRepository.findByCandidateId(candidateId).stream().filter(a->a.getCompany().getId().equals(portal.getCompany().getId()) && a.getStatus()==com.example.demo.recruitment.entity.Applicant.ApplicantStatus.HIRED).findFirst().orElseThrow(()->new com.example.demo.common.exception.BadRequestException("Only a hired candidate in this company can start onboarding"));
        if(!onboardingCandidateRepository.findByCandidateId(candidateId).isEmpty()) throw new com.example.demo.common.exception.BadRequestException("This candidate already has onboarding. Open the existing record");
        oc.setId(null);oc.setCandidate(applicant.getCandidate());oc.setPortal(portal);oc.setStatus(OnboardingCandidate.OnboardingStatus.IN_PROGRESS);
        var saved=onboardingCandidateRepository.save(oc);checklist(saved);assignTemplateTasks(saved);return saved;
    }

    @Transactional
    public OnboardingCandidate completeOnboarding(Long id) {
        OnboardingCandidate oc = getCandidateById(id);
        entityManager.lock(oc,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(oc.getStatus()==OnboardingCandidate.OnboardingStatus.COMPLETED) return oc;
        editable(oc);checklist(oc);
        var stages=candidateStageRepository.findByOnboardingCandidateId(id);var tasks=candidateTaskRepository.findByOnboardingCandidateId(id);
        if(stages.isEmpty() && tasks.isEmpty()) throw new com.example.demo.common.exception.BadRequestException("Configure an onboarding checklist before completing it");
        if(stages.stream().anyMatch(row->!Boolean.TRUE.equals(row.getIsCompleted())) || tasks.stream().anyMatch(row->!Boolean.TRUE.equals(row.getIsCompleted()))) throw new com.example.demo.common.exception.BadRequestException("Complete every onboarding stage and task first");
        oc.setStatus(OnboardingCandidate.OnboardingStatus.COMPLETED);
        log.info("Marking OnboardingCandidate id={} as COMPLETED", id);
        return onboardingCandidateRepository.save(oc);
    }

    // ─── CandidateStage CRUD ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateStage> listCandidateStages(Long candidateId) {
        getCandidateById(candidateId);var rows=candidateStageRepository.findByOnboardingCandidateId(candidateId);rows.forEach(r->org.hibernate.Hibernate.initialize(r.getStage()));return rows;
    }

    @Transactional
    public CandidateStage addCandidateStage(Long candidateId, CandidateStage cs) {
        var owner=getCandidateById(candidateId);editable(owner);cs.setId(null);cs.setIsCompleted(false);cs.setOnboardingCandidate(owner);
        if (cs.getStage() != null && cs.getStage().getId() != null) {
            var stage=stageRepository.findById(cs.getStage().getId()).orElseThrow();
            if(!stage.getPortal().getId().equals(owner.getPortal().getId())) throw new com.example.demo.common.exception.BadRequestException("Stage belongs to a different portal");
            var existing=candidateStageRepository.findByOnboardingCandidateId(candidateId).stream().filter(r->r.getStage().getId().equals(stage.getId())).findFirst();if(existing.isPresent()) return existing.get();
            cs.setStage(stage);
        }
        return candidateStageRepository.save(cs);
    }

    @Transactional
    public CandidateStage completeCandidateStage(Long id) {
        CandidateStage cs = candidateStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateStage", id));
        editable(cs.getOnboardingCandidate());
        if(candidateTaskRepository.findByOnboardingCandidateId(cs.getOnboardingCandidate().getId()).stream().anyMatch(t->t.getStage()!=null && t.getStage().getId().equals(cs.getStage().getId()) && !Boolean.TRUE.equals(t.getIsCompleted()))) throw new com.example.demo.common.exception.BadRequestException("Complete this stage tasks first");
        cs.setIsCompleted(true);
        return candidateStageRepository.save(cs);
    }

    // ─── CandidateTask CRUD ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateTask> listCandidateTasks(Long candidateId) {
        getCandidateById(candidateId);var rows=candidateTaskRepository.findByOnboardingCandidateId(candidateId);rows.forEach(r->org.hibernate.Hibernate.initialize(r.getStage()));return rows;
    }

    @Transactional
    public CandidateTask addCandidateTask(Long candidateId, CandidateTask task) {
        var owner=getCandidateById(candidateId);editable(owner);task.setId(null);task.setIsCompleted(false);task.setOnboardingCandidate(owner);
        if (task.getStage() != null && task.getStage().getId() != null) {
            var stage=stageRepository.findById(task.getStage().getId()).orElseThrow();if(!stage.getPortal().getId().equals(owner.getPortal().getId())) throw new com.example.demo.common.exception.BadRequestException("Stage belongs to a different portal");task.setStage(stage);
        }
        return candidateTaskRepository.save(task);
    }

    /**
     * Assign a specific OnboardingTask (by taskId) to a candidate (by candidateId),
     * creating a CandidateTask record populated from the template task.
     */
    @Transactional
    public CandidateTask assignTaskToCandidate(Long candidateId, Long taskId) {
        OnboardingCandidate candidate = getCandidateById(candidateId);editable(candidate);
        OnboardingTask taskTemplate = getTaskById(taskId);
        if(!taskTemplate.getCompany().getId().equals(candidate.getPortal().getCompany().getId())) throw new com.example.demo.common.exception.BadRequestException("Task template belongs to a different company");

        CandidateTask ct = new CandidateTask();
        ct.setOnboardingCandidate(candidate);
        ct.setTitle(taskTemplate.getTitle());
        ct.setDescription(taskTemplate.getDescription());
        ct.setIsCompleted(false);
        if (taskTemplate.getDaysToComplete() != null) {
            ct.setDueDate(LocalDate.now().plusDays(taskTemplate.getDaysToComplete()));
        }
        log.info("Assigning task '{}' to onboarding candidate id={}", taskTemplate.getTitle(), candidateId);
        return candidateTaskRepository.save(ct);
    }

    /**
     * Mark a CandidateTask as done.
     */
    @Transactional
    public CandidateTask completeTask(Long candidateTaskId) {
        CandidateTask ct = candidateTaskRepository.findById(candidateTaskId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateTask", candidateTaskId));
        editable(ct.getOnboardingCandidate());ct.setIsCompleted(true);
        log.info("Completing CandidateTask id={}", candidateTaskId);
        return candidateTaskRepository.save(ct);
    }

    /**
     * Advance an OnboardingCandidate to the next sequential stage.
     * Marks the current stage as completed and marks the next stage as active
     * by creating a CandidateStage entry for it.
     */
    @Transactional
    public Map<String,Object> advanceStage(Long candidateId) {
        var candidate=getCandidateById(candidateId);editable(candidate);checklist(candidate);
        var stages=candidateStageRepository.findByOnboardingCandidateId(candidateId).stream().sorted(java.util.Comparator.comparing(r->r.getStage().getSequence())).toList();
        var current=stages.stream().filter(row->!Boolean.TRUE.equals(row.getIsCompleted())).findFirst();
        current.ifPresent(row->completeCandidateStage(row.getId()));
        if(stages.stream().allMatch(row->Boolean.TRUE.equals(row.getIsCompleted()))) {completeOnboarding(candidateId);return Map.of("status","COMPLETED","candidateId",candidateId);}
        return Map.of("status","IN_PROGRESS","candidateId",candidateId);
    }

    /**
     * Initiate onboarding for an employee against a given portal.
     * Creates an OnboardingCandidate record (using the employee's linked Candidate if available),
     * then creates CandidateStage entries for each portal stage and assigns all company tasks.
     */
    @Transactional
    public Map<String,Object> initiateOnboarding(Long employeeId,Long portalId) {
        var employee=employeeRepository.findById(employeeId).orElseThrow(()->new ResourceNotFoundException("Employee",employeeId));var portal=getPortalById(portalId);access(employee.getCompany().getId());
        if(!Boolean.TRUE.equals(portal.getIsActive()) || portal.getExpiresAt()!=null && portal.getExpiresAt().isBefore(LocalDate.now())) throw new com.example.demo.common.exception.BadRequestException("Portal is inactive or expired");
        if(!employee.getCompany().getId().equals(portal.getCompany().getId())) throw new com.example.demo.common.exception.BadRequestException("Employee and portal must belong to the same company");
        var found=entityManager.createQuery("select c from Candidate c where c.employeeId=:id",Candidate.class).setParameter("id",employeeId).getResultList();
        var candidate=found.isEmpty()?new Candidate():found.getFirst();
        if(found.isEmpty()){candidate.setName(employee.getFirstName()+" "+(employee.getLastName()==null?"":employee.getLastName()));candidate.setEmail(employee.getEmail());candidate.setEmployeeId(employeeId);candidate.setSource("EXISTING_EMPLOYEE");entityManager.persist(candidate);}
        var existing=onboardingCandidateRepository.findByCandidateId(candidate.getId());if(!existing.isEmpty()){var same=existing.stream().filter(c->c.getPortal().getId().equals(portalId)).findFirst();if(same.isPresent()) return Map.of("id",same.get().getId(),"candidateId",same.get().getId());throw new com.example.demo.common.exception.BadRequestException("This employee already has onboarding in another portal");}
        var oc=new OnboardingCandidate();oc.setCandidate(candidate);oc.setPortal(portal);var saved=onboardingCandidateRepository.save(oc);checklist(saved);assignTemplateTasks(saved);
        return Map.of("id",saved.getId(),"candidateId",saved.getId(),"employeeId",employeeId);
    }

    // ─── Offer Letter ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> sendOfferLetter(Long id) {
        OnboardingCandidate oc = getCandidateById(id);
        String recipientEmail = (oc.getCandidate() != null) ? oc.getCandidate().getEmail() : null;
        Map<String, Object> result = new HashMap<>();
        result.put("candidateId", id);
        if (recipientEmail != null) {
            Long companyId = (oc.getPortal() != null && oc.getPortal().getCompany() != null)
                    ? oc.getPortal().getCompany().getId() : null;
            emailService.sendEmail(companyId, recipientEmail,
                    "Your Offer Letter",
                    "<p>Your hiring team has an offer update for you. Please contact HR to review the approved offer and joining details.</p>",
                    null);
            result.put("message", "Offer letter sent to " + recipientEmail);
            result.put("email", recipientEmail);
        } else {
            throw new com.example.demo.common.exception.BadRequestException("Candidate email is required");
        }
        return result;
    }

    @Transactional
    public OnboardingCandidate updateOfferLetterStatus(Long id, String status) {
        OnboardingCandidate oc = getCandidateById(id);
        if("COMPLETED".equals(status)) return completeOnboarding(id);
        throw new com.example.demo.common.exception.BadRequestException("Offer status cannot change onboarding progress; use the onboarding checklist");
    }

    /**
     * Retrieve portal details by its public token (for external portal access).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPortalByToken(String token) {
        // Query portals and find by token field
        List<OnboardingPortal> portals = portalRepository.findAll();
        OnboardingPortal portal = portals.stream()
                .filter(p -> token.equals(p.getToken()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "OnboardingPortal not found for token: " + token));

        if (Boolean.FALSE.equals(portal.getIsActive())) {
            throw new ResourceNotFoundException("OnboardingPortal with token " + token + " is inactive");
        }
        if (portal.getExpiresAt() != null && LocalDate.now().isAfter(portal.getExpiresAt())) {
            throw new ResourceNotFoundException("OnboardingPortal with token " + token + " has expired");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("portalId", portal.getId());
        result.put("title", portal.getTitle());
        result.put("isActive", portal.getIsActive());
        result.put("expiresAt", portal.getExpiresAt());
        result.put("message", "Your HR team manages onboarding progress and employee account creation.");
        result.put("status", "ACTIVE");
        return result;
    }

    /**
     * Create a user account for a candidate using their portal token.
     * Looks up the portal by token, validates it, then records the account creation request.
     * Actual User entity provisioning should be handled by the auth/identity module.
     */
    @Transactional
    public Map<String,Object> createAccountForCandidate(String token,Map<String,Object> details) {
        throw new com.example.demo.common.exception.BadRequestException("Candidate accounts are created by HR using Convert to employee after onboarding is completed");
    }

    /**
     * Return onboarding dashboard statistics.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOnboardingDashboard() {
        var filter=ScopeFilter.<EmployeeOnboarding>byEmployeeCompany();List<EmployeeOnboarding> all=filter==null?employeeOnboardingRepository.findAll():employeeOnboardingRepository.findAll(filter);
        long total = all.size();
        long completed = all.stream()
                .filter(o -> EmployeeOnboarding.OnboardingStatus.COMPLETED.equals(o.getStatus()))
                .count();
        long inProgress = all.stream()
                .filter(o -> EmployeeOnboarding.OnboardingStatus.IN_PROGRESS.equals(o.getStatus()))
                .count();
        long notStarted = all.stream()
                .filter(o -> EmployeeOnboarding.OnboardingStatus.PENDING.equals(o.getStatus()))
                .count();

        // Candidate-based stats
        var scope=com.example.demo.common.context.AccessScopeContext.get();List<OnboardingCandidate> allCandidates=onboardingCandidateRepository.findAll().stream().filter(c->scope!=null && scope.canAccess(c.getPortal().getCompany().getId())).toList();
        long totalCandidates = allCandidates.size();
        long completedCandidates = allCandidates.stream()
                .filter(c -> OnboardingCandidate.OnboardingStatus.COMPLETED.equals(c.getStatus()))
                .count();
        long inProgressCandidates = allCandidates.stream()
                .filter(c -> OnboardingCandidate.OnboardingStatus.IN_PROGRESS.equals(c.getStatus()))
                .count();

        Map<String, Object> result = new HashMap<>();
        result.put("totalOnboarding", total);
        result.put("completedOnboarding", completed);
        result.put("inProgressOnboarding", inProgress);
        result.put("notStartedOnboarding", notStarted);
        result.put("totalCandidates", totalCandidates);
        result.put("completedCandidates", completedCandidates);
        result.put("inProgressCandidates", inProgressCandidates);
        return result;
    }
}
