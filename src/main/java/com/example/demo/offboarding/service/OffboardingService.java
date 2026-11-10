package com.example.demo.offboarding.service;

import com.example.demo.audit.AuditService;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.offboarding.entity.*;
import com.example.demo.offboarding.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OffboardingService {

    private final EmployeeOffboardingRepository offboardingRepository;
    private final ResignationLetterRepository resignationRepository;
    private final ExitReasonRepository exitReasonRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final OffboardingPlanRepository planRepository;
    private final OffboardingStageRepository stageRepository;
    private final OffboardingStageFileRepository stageFileRepository;
    private final OffboardingEmployeeTaskRepository employeeTaskRepository;
    private final OffboardingNoteRepository noteRepository;
    private final OffboardingGeneralSettingRepository generalSettingRepository;
    private final OffboardingTaskRepository offboardingTaskRepository;
    private final AuditService auditService;
    private final com.example.demo.auth.repository.UserRoleRepository userRoles;
    private final com.example.demo.auth.repository.UserRepository users;
    private final com.example.demo.asset.repository.AssetAssignmentRepository assets;
    private final com.example.demo.payroll.repository.PayslipRepository payslips;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private void companyAccess(Long id) {com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(id);}
    private void ensureEditable(EmployeeOffboarding record) {
        companyAccess(record.getEmployee().getCompany().getId());
        if(record.getStatus()==EmployeeOffboarding.OffboardingStatus.COMPLETED) throw new BadRequestException("Completed offboarding is read-only");
    }
    private com.example.demo.base.entity.Company selectedCompany() {
        Long id=com.example.demo.common.context.CompanyContext.get();if(id==null) throw new BadRequestException("Select a company");companyAccess(id);return companyRepository.findById(id).orElseThrow();
    }
    private OffboardingPlan scopedPlan(Long id) {var row=planRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("OffboardingPlan",id));if(row.getCompany()==null) throw new BadRequestException("Plan has no company");companyAccess(row.getCompany().getId());return row;}
    private OffboardingStage scopedStage(Long id) {var row=stageRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("OffboardingStage",id));scopedPlan(row.getPlan().getId());return row;}
    private void endCompanyAccess(Employee employee) {
        if(employee.getUser()!=null) {
            var account=users.findByIdForUpdate(employee.getUser().getId()).orElseThrow();
            var grants=userRoles.findByUserId(account.getId());
            for(var grant:grants) if(grant.getCompany()!=null && grant.getCompany().getId().equals(employee.getCompany().getId())) {
                grant.setAssignmentStatus(com.example.demo.auth.entity.UserRole.AssignmentStatus.REVOKED);grant.setActive(false);grant.setExpiresOn(LocalDate.now().minusDays(1));userRoles.save(grant);
            }
            if(grants.stream().noneMatch(g->g.isEffectiveOn(LocalDate.now()))) {account.setActive(false);users.save(account);}
        }
    }
    private boolean platformEmployee(Employee employee) {
        return employee.getUser()!=null && userRoles.findByUserId(employee.getUser().getId()).stream().anyMatch(r->r.isEffectiveOn(LocalDate.now()) && r.getRole().getName()==com.example.demo.auth.entity.Role.RoleName.PLATFORM_SUPER_ADMIN);
    }
    private void defaultChecklist(EmployeeOffboarding record) {
        for(String title:List.of("Complete knowledge transfer and handover","Review final salary and leave settlement")) {
            var task=new OffboardingEmployeeTask();task.setTitle(title);task.setEmployeeOffboarding(record);task.setDueDate(record.getExitDate());task.setIsCompleted(false);employeeTaskRepository.save(task);
        }
    }
    @Transactional(readOnly=true)
    public Map<String,Object> completionReadiness(Long id) {
        var record=getById(id);var blockers=new java.util.ArrayList<String>();
        var tasks=employeeTaskRepository.findByEmployeeOffboardingId(id).stream().filter(OffboardingEmployeeTask::isActive).toList();
        if(tasks.isEmpty()) blockers.add("Add and complete the handover and final-settlement checklist");
        tasks.stream().filter(t->!Boolean.TRUE.equals(t.getIsCompleted())).forEach(t->blockers.add("Pending task: "+t.getTitle()));
        long held=assets.findByEmployeeId(record.getEmployee().getId()).stream().filter(a->a.isActive() && !Boolean.TRUE.equals(a.getIsReturned())).count();
        if(held>0) blockers.add("Return "+held+" outstanding company asset(s)");
        long unpaid=payslips.findByEmployeeId(record.getEmployee().getId()).stream().filter(p->p.isActive() && p.getStatus()!=com.example.demo.payroll.entity.Payslip.PayslipStatus.PAID).count();
        if(unpaid>0) blockers.add("Review and settle "+unpaid+" unpaid payslip(s) in Payroll");
        if(record.getExitDate()==null || record.getExitDate().isAfter(LocalDate.now())) blockers.add("Last working date has not arrived");
        if(record.getEmployeeDeactivatedAt()==null || record.getEmployee().isActive()) blockers.add("Employment access has not been ended yet");
        if(platformEmployee(record.getEmployee())) blockers.add("Platform administrator access must be transferred or revoked separately before completion");
        return Map.of("ready",blockers.isEmpty(),"blockers",blockers,"outstandingAssets",held,"unpaidPayslips",unpaid,"accessEnded",record.getEmployeeDeactivatedAt()!=null && !record.getEmployee().isActive());
    }

    // ─── Employee Offboarding ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeOffboarding> getByEmployee(Long employeeId) {
        var employee=employeeRepository.findById(employeeId).orElseThrow(()->new ResourceNotFoundException("Employee",employeeId));companyAccess(employee.getCompany().getId());var scope=com.example.demo.common.context.AccessScopeContext.get();if(scope!=null && scope.isSelfScope() && (employee.getUser()==null || !scope.getUserId().equals(employee.getUser().getId()))) throw new org.springframework.security.access.AccessDeniedException("Not your employee record");return offboardingRepository.findByEmployeeId(employeeId);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeOffboarding> list(EmployeeOffboarding.OffboardingStatus status, Pageable pageable) {
        Specification<EmployeeOffboarding> spec = ScopeFilter.byEmployeeCompany();
        if (status != null) {
            Specification<EmployeeOffboarding> statusSpec = (root, q, cb) -> cb.equal(root.get("status"), status);
            spec = spec != null ? spec.and(statusSpec) : statusSpec;
        }
        // Leavers tab uses its own dedicated endpoint; the default list excludes already-deactivated leavers.
        Specification<EmployeeOffboarding> notDeactivated = (root, q, cb) -> cb.isNull(root.get("employeeDeactivatedAt"));
        spec = spec != null ? spec.and(notDeactivated) : notDeactivated;
        Page<EmployeeOffboarding> result = spec != null ? offboardingRepository.findAll(spec, pageable) : offboardingRepository.findAll(pageable);
        initializeEmployees(result);
        return result;
    }

    @Transactional(readOnly = true)
    public Page<EmployeeOffboarding> listLeavers(Pageable pageable) {
        Specification<EmployeeOffboarding> spec = ScopeFilter.byEmployeeCompany();
        Specification<EmployeeOffboarding> deactivated = (root, q, cb) -> cb.isNotNull(root.get("employeeDeactivatedAt"));
        spec = spec != null ? spec.and(deactivated) : deactivated;
        Page<EmployeeOffboarding> result = offboardingRepository.findAll(spec, pageable);
        initializeEmployees(result);
        return result;
    }

    @Transactional(readOnly = true)
    public EmployeeOffboarding getById(Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        enforceReadAccess(eo);
        org.hibernate.Hibernate.initialize(eo.getEmployee());
        return eo;
    }

    /** jackson-datatype-hibernate6 serializes uninitialized lazy proxies as null; force-load them while the session is still open. */
    private void initializeEmployees(Page<EmployeeOffboarding> page) {
        page.getContent().forEach(eo -> org.hibernate.Hibernate.initialize(eo.getEmployee()));
    }

    private void enforceReadAccess(EmployeeOffboarding eo) {
        var scope = com.example.demo.common.context.AccessScopeContext.get();
        if (scope == null) {companyAccess(eo.getEmployee().getCompany().getId());return;}
        if (scope.hasUnrestrictedAccess()) return;
        if (scope.isSelfScope()) {
            Long userId = scope.getUserId();
            boolean owns = eo.getEmployee() != null && eo.getEmployee().getUser() != null
                    && eo.getEmployee().getUser().getId().equals(userId);
            if (!owns) throw new org.springframework.security.access.AccessDeniedException("Not authorized to access this offboarding record");
            return;
        }
        Long companyId = eo.getEmployee() != null && eo.getEmployee().getCompany() != null
                ? eo.getEmployee().getCompany().getId() : null;
        if (companyId == null || !scope.canAccess(companyId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to access this offboarding record");
        }
    }

    public EmployeeOffboarding create(EmployeeOffboarding offboarding, Long initiatedByUserId, String initiatedByName) {
        if (offboarding.getEmployee() == null || offboarding.getEmployee().getId() == null) {
            throw new BadRequestException("employee is required");
        }
        Employee employee = employeeRepository.findById(offboarding.getEmployee().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", offboarding.getEmployee().getId()));
        companyAccess(employee.getCompany().getId());
        entityManager.lock(employee,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(!employee.isActive()) throw new BadRequestException("This employee is already inactive");
        if(platformEmployee(employee)) throw new BadRequestException("Transfer or revoke platform administrator access before starting offboarding");
        if(offboardingRepository.findByEmployeeId(employee.getId()).stream().anyMatch(r->r.getStatus()!=EmployeeOffboarding.OffboardingStatus.COMPLETED)) throw new BadRequestException("An offboarding record already exists for this employee");
        if(Boolean.TRUE.equals(offboarding.getImmediateLeaving())) offboarding.setExitDate(LocalDate.now());
        if(offboarding.getExitDate()==null) throw new BadRequestException("Last working date is required");
        if(offboarding.getRetentionPeriodMonths()!=null && offboarding.getRetentionPeriodMonths()<0) throw new BadRequestException("Retention period cannot be negative");
        offboarding.setId(null);offboarding.setEmployeeDeactivatedAt(null);offboarding.setCompletedDate(null);offboarding.setStatus(EmployeeOffboarding.OffboardingStatus.IN_PROGRESS);
        offboarding.setEmployee(employee);
        if (offboarding.getTask() != null && offboarding.getTask().getId() != null) {
            offboarding.setTask(offboardingTaskRepository.getReferenceById(offboarding.getTask().getId()));
        } else {
            offboarding.setTask(null);
        }
        offboarding.setInitiatedByUserId(initiatedByUserId);
        offboarding.setInitiatedByName(initiatedByName);
        if (offboarding.getRetentionPeriodMonths() != null && offboarding.getExitDate() != null) {
            offboarding.setRetentionExpiresAt(offboarding.getExitDate().plusMonths(offboarding.getRetentionPeriodMonths()));
        }
        EmployeeOffboarding saved = offboardingRepository.save(offboarding);defaultChecklist(saved);

        auditService.log("EmployeeOffboarding", saved.getId(), "INITIATED", null, summarize(saved));

        boolean immediate = Boolean.TRUE.equals(saved.getImmediateLeaving())
                || saved.getExitDate() == null
                || !saved.getExitDate().isAfter(LocalDate.now());
        if (immediate) {
            saved = activateOffboarding(saved);
        }
        return saved;
    }

    public EmployeeOffboarding update(Long id, EmployeeOffboarding updated) {
        EmployeeOffboarding eo = getById(id);ensureEditable(eo);
        if(eo.getEmployeeDeactivatedAt()!=null) throw new BadRequestException("Departure is already effective; employee dates cannot be changed");
        if(Boolean.TRUE.equals(updated.getImmediateLeaving())) updated.setExitDate(LocalDate.now());
        if(updated.getExitDate()==null) throw new BadRequestException("Last working date is required");
        if(updated.getRetentionPeriodMonths()!=null && updated.getRetentionPeriodMonths()<0) throw new BadRequestException("Retention period cannot be negative");
        eo.setNoticePeriodType(updated.getNoticePeriodType());
        eo.setExitDate(updated.getExitDate());
        eo.setReasonOfLeaving(updated.getReasonOfLeaving());
        eo.setRetentionPeriodMonths(updated.getRetentionPeriodMonths());
        eo.setImmediateLeaving(updated.getImmediateLeaving());
        if (eo.getRetentionPeriodMonths() != null && eo.getExitDate() != null) {
            eo.setRetentionExpiresAt(eo.getExitDate().plusMonths(eo.getRetentionPeriodMonths()));
        }
        var saved=offboardingRepository.save(eo);if(!saved.getExitDate().isAfter(LocalDate.now())) return activateOffboarding(saved);return saved;
    }

    public EmployeeOffboarding complete(Long id) {
        var eo=getById(id);companyAccess(eo.getEmployee().getCompany().getId());entityManager.flush();entityManager.lock(eo,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);entityManager.refresh(eo);
        if(eo.getStatus()==EmployeeOffboarding.OffboardingStatus.COMPLETED) return eo;
        var readiness=completionReadiness(id);
        if(!Boolean.TRUE.equals(readiness.get("ready"))) throw new BadRequestException(String.join("; ",(List<String>)readiness.get("blockers")));
        eo.setStatus(EmployeeOffboarding.OffboardingStatus.COMPLETED);eo.setCompletedDate(LocalDate.now());
        auditService.log("EmployeeOffboarding",id,"COMPLETED",null,summarize(eo));return offboardingRepository.save(eo);
    }

    /**
     * Re-fetches the record fresh within its own transaction before activating — callers
     * (e.g. OffboardingScheduler) may be holding an EmployeeOffboarding read outside any
     * transaction, whose lazy "employee" association can no longer be initialized.
     */
    public EmployeeOffboarding activateOffboardingById(Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        entityManager.flush();entityManager.lock(eo,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);entityManager.refresh(eo);
        return activateOffboarding(eo);
    }

    /**
     * Deactivates the linked Employee (removing them from active Attendance/Payroll/Leave
     * eligibility, which all filter on Employee.isActive) and moves them into the Leavers
     * view. Idempotent — a record with employeeDeactivatedAt already set is left untouched.
     */
    public EmployeeOffboarding activateOffboarding(EmployeeOffboarding eo) {
        if (eo.getEmployeeDeactivatedAt() != null) {
            // Repair legacy departures, but do not disable an employee restored for a new employment period.
            if(!eo.getEmployee().isActive()) endCompanyAccess(eo.getEmployee());
            return eo;
        }
        if(eo.getExitDate()==null || eo.getExitDate().isAfter(LocalDate.now())) throw new BadRequestException("Last working date has not arrived");
        Employee employee = eo.getEmployee();entityManager.lock(employee,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        endCompanyAccess(employee);
        Map<String, Object> before = Map.of("employeeActive", employee.isActive());
        employee.setActive(false);
        employeeRepository.save(employee);

        eo.setEmployeeDeactivatedAt(LocalDateTime.now());
        EmployeeOffboarding saved = offboardingRepository.save(eo);

        auditService.log("EmployeeOffboarding", saved.getId(), "EMPLOYEE_DEACTIVATED", before, summarize(saved));
        return saved;
    }

    private Map<String, Object> summarize(EmployeeOffboarding eo) {
        Map<String, Object> m = new HashMap<>();
        m.put("employeeId", eo.getEmployee() != null ? eo.getEmployee().getId() : null);
        m.put("exitDate", eo.getExitDate());
        m.put("reasonOfLeaving", eo.getReasonOfLeaving());
        m.put("retentionPeriodMonths", eo.getRetentionPeriodMonths());
        m.put("immediateLeaving", eo.getImmediateLeaving());
        m.put("initiatedByName", eo.getInitiatedByName());
        m.put("status", eo.getStatus());
        m.put("employeeDeactivatedAt", eo.getEmployeeDeactivatedAt());
        return m;
    }

    public void delete(Long id) {
        var record=getById(id);ensureEditable(record);throw new BadRequestException("Offboarding records retain employment history and cannot be deleted");
    }

    // ─── Resignation Letters ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ResignationLetter> listResignations() {
        var spec = ScopeFilter.<ResignationLetter>byEmployee();
        return spec != null ? resignationRepository.findAll(spec) : resignationRepository.findAll();
    }

    public ResignationLetter createResignation(ResignationLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getId() != null) {
            var employee=employeeRepository.findById(letter.getEmployee().getId()).orElseThrow();companyAccess(employee.getCompany().getId());var scope=com.example.demo.common.context.AccessScopeContext.get();if(scope!=null && scope.isSelfScope() && (employee.getUser()==null || !scope.getUserId().equals(employee.getUser().getId()))) throw new org.springframework.security.access.AccessDeniedException("You can only submit your own resignation");letter.setEmployee(employee);letter.setCompany(employee.getCompany());letter.setStatus(ResignationLetter.ResignationStatus.REQUESTED);letter.setId(null);
        }
        if(letter.getEmployee()==null) throw new BadRequestException("Employee is required");
        return resignationRepository.save(letter);
    }

    public ResignationLetter approveResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        if(r.getEmployee()==null) throw new BadRequestException("Resignation must identify an employee");companyAccess(r.getEmployee().getCompany().getId());
        if(r.getStatus()==ResignationLetter.ResignationStatus.REJECTED) throw new BadRequestException("Rejected resignations cannot be approved");
        if(r.getPlannedToLeaveOn()==null) throw new BadRequestException("Confirm the last working date before approving");
        if(offboardingRepository.findByEmployeeId(r.getEmployee().getId()).stream().noneMatch(o->o.getStatus()!=EmployeeOffboarding.OffboardingStatus.COMPLETED)) {
            var record=new EmployeeOffboarding();record.setEmployee(r.getEmployee());record.setExitDate(r.getPlannedToLeaveOn());record.setReasonOfLeaving(r.getDescription());record.setImmediateLeaving(false);create(record,null,"Resignation approval");
        }
        r.setStatus(ResignationLetter.ResignationStatus.APPROVED);return resignationRepository.save(r);
    }

    public ResignationLetter rejectResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        if(r.getEmployee()==null) throw new BadRequestException("Employee is required");companyAccess(r.getEmployee().getCompany().getId());if(r.getStatus()!=ResignationLetter.ResignationStatus.REQUESTED) throw new BadRequestException("Only a pending resignation can be rejected");
        r.setStatus(ResignationLetter.ResignationStatus.REJECTED);
        return resignationRepository.save(r);
    }

    // ─── Exit Reasons ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExitReason> listExitReasons() {
        var spec = ScopeFilter.<ExitReason>byCompany();
        return spec != null ? exitReasonRepository.findAll(spec) : exitReasonRepository.findAll();
    }

    public ExitReason createExitReason(ExitReason reason) {
        reason.setCompany(selectedCompany());reason.setId(null);
        return exitReasonRepository.save(reason);
    }

    public void deleteExitReason(Long id) {
        var reason=exitReasonRepository.findById(id).orElseThrow();companyAccess(reason.getCompany().getId());exitReasonRepository.delete(reason);
    }

    // ─── Offboarding Plans ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingPlan> listPlans() {
        var spec = ScopeFilter.<OffboardingPlan>byCompany();
        return spec != null ? planRepository.findAll(spec) : planRepository.findAll();
    }

    public OffboardingPlan createPlan(OffboardingPlan plan) {
        plan.setCompany(selectedCompany());plan.setId(null);
        return planRepository.save(plan);
    }

    public OffboardingPlan updatePlan(Long id, OffboardingPlan updated) {
        OffboardingPlan plan = scopedPlan(id);
        plan.setTitle(updated.getTitle());
        plan.setDescription(updated.getDescription());
        plan.setIsActive(updated.getIsActive());
        return planRepository.save(plan);
    }

    public void deletePlan(Long id) {
        scopedPlan(id);if(!stageRepository.findByPlanIdOrderBySequenceAsc(id).isEmpty()) throw new BadRequestException("Remove the plan stages first, or deactivate the plan to preserve history");planRepository.deleteById(id);
    }

    // ─── Offboarding Stages ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStage> listStages(Long planId) {
        scopedPlan(planId);return stageRepository.findByPlanIdOrderBySequenceAsc(planId);
    }

    public OffboardingStage createStage(Long planId, OffboardingStage stage) {
        stage.setId(null);stage.setPlan(scopedPlan(planId));
        return stageRepository.save(stage);
    }

    public OffboardingStage updateStage(Long id, OffboardingStage updated) {
        OffboardingStage stage = scopedStage(id);
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    public void deleteStage(Long id) {
        scopedStage(id);if(!stageFileRepository.findByStageId(id).isEmpty()) throw new BadRequestException("Remove stage attachments before deleting this stage");stageRepository.deleteById(id);
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStageFile> listStageFiles(Long stageId) {
        scopedStage(stageId);return stageFileRepository.findByStageId(stageId);
    }

    public OffboardingStageFile addStageFile(Long stageId, OffboardingStageFile file) {
        file.setId(null);file.setStage(scopedStage(stageId));
        return stageFileRepository.save(file);
    }

    public void deleteStageFile(Long id) {
        var file=stageFileRepository.findById(id).orElseThrow();scopedStage(file.getStage().getId());stageFileRepository.delete(file);
    }

    // ─── Employee Tasks ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingEmployeeTask> listEmployeeTasks(Long offboardingId) {
        getById(offboardingId);return employeeTaskRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingEmployeeTask assignEmployeeTask(Long offboardingId, OffboardingEmployeeTask task) {
        var record=getById(offboardingId);ensureEditable(record);task.setId(null);task.setIsCompleted(false);task.setEmployeeOffboarding(record);
        if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
            var assignee=employeeRepository.findById(task.getAssignedTo().getId()).orElseThrow();if(!assignee.getCompany().getId().equals(record.getEmployee().getCompany().getId())) throw new BadRequestException("Task owner belongs to another company");task.setAssignedTo(assignee);
        }
        return employeeTaskRepository.save(task);
    }

    public OffboardingEmployeeTask completeEmployeeTask(Long id) {
        OffboardingEmployeeTask task = employeeTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingEmployeeTask", id));
        ensureEditable(task.getEmployeeOffboarding());task.setIsCompleted(true);
        return employeeTaskRepository.save(task);
    }

    // ─── Notes ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingNote> listNotes(Long offboardingId) {
        getById(offboardingId);return noteRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingNote addNote(Long offboardingId, OffboardingNote note) {
        var record=getById(offboardingId);ensureEditable(record);note.setId(null);note.setEmployeeOffboarding(record);
        if (note.getCreatedBy() != null && note.getCreatedBy().getId() != null) {
            note.setCreatedBy(employeeRepository.getReferenceById(note.getCreatedBy().getId()));
        }
        return noteRepository.save(note);
    }

    public void deleteNote(Long id) {
        var note=noteRepository.findById(id).orElseThrow();ensureEditable(note.getEmployeeOffboarding());noteRepository.delete(note);
    }

    // ─── General Settings ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OffboardingGeneralSetting getSettings() {
        Long companyId=selectedCompany().getId();var result=generalSettingRepository.findByCompanyId(companyId);
        return result.orElse(new OffboardingGeneralSetting());
    }

    public OffboardingGeneralSetting upsertSettings(OffboardingGeneralSetting incoming) {
        var company=selectedCompany();var setting=generalSettingRepository.findByCompanyId(company.getId()).orElse(new OffboardingGeneralSetting());setting.setCompany(company);
        setting.setNoticePeriodDays(incoming.getNoticePeriodDays());
        setting.setEnableExitInterview(incoming.getEnableExitInterview());
        setting.setEnableAssetReturnCheck(incoming.getEnableAssetReturnCheck());
        setting.setEnableKnowledgeTransfer(incoming.getEnableKnowledgeTransfer());
        return generalSettingRepository.save(setting);
    }
}
