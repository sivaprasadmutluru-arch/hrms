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

    // ─── Employee Offboarding ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeOffboarding> getByEmployee(Long employeeId) {
        return offboardingRepository.findByEmployeeId(employeeId);
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
        if (scope == null || scope.hasUnrestrictedAccess()) return;
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
        EmployeeOffboarding saved = offboardingRepository.save(offboarding);

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
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        eo.setNoticePeriodType(updated.getNoticePeriodType());
        eo.setExitDate(updated.getExitDate());
        eo.setReasonOfLeaving(updated.getReasonOfLeaving());
        eo.setRetentionPeriodMonths(updated.getRetentionPeriodMonths());
        eo.setImmediateLeaving(updated.getImmediateLeaving());
        if (eo.getRetentionPeriodMonths() != null && eo.getExitDate() != null) {
            eo.setRetentionExpiresAt(eo.getExitDate().plusMonths(eo.getRetentionPeriodMonths()));
        }
        return offboardingRepository.save(eo);
    }

    public EmployeeOffboarding complete(Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        eo.setStatus(EmployeeOffboarding.OffboardingStatus.COMPLETED);
        eo.setCompletedDate(LocalDate.now());
        return offboardingRepository.save(eo);
    }

    /**
     * Re-fetches the record fresh within its own transaction before activating — callers
     * (e.g. OffboardingScheduler) may be holding an EmployeeOffboarding read outside any
     * transaction, whose lazy "employee" association can no longer be initialized.
     */
    public EmployeeOffboarding activateOffboardingById(Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        return activateOffboarding(eo);
    }

    /**
     * Deactivates the linked Employee (removing them from active Attendance/Payroll/Leave
     * eligibility, which all filter on Employee.isActive) and moves them into the Leavers
     * view. Idempotent — a record with employeeDeactivatedAt already set is left untouched.
     */
    public EmployeeOffboarding activateOffboarding(EmployeeOffboarding eo) {
        if (eo.getEmployeeDeactivatedAt() != null) {
            return eo; // already processed
        }
        Employee employee = eo.getEmployee();
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
        offboardingRepository.deleteById(id);
    }

    // ─── Resignation Letters ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ResignationLetter> listResignations() {
        var spec = ScopeFilter.<ResignationLetter>byEmployee();
        return spec != null ? resignationRepository.findAll(spec) : resignationRepository.findAll();
    }

    public ResignationLetter createResignation(ResignationLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getId() != null) {
            letter.setEmployee(employeeRepository.getReferenceById(letter.getEmployee().getId()));
        }
        if (letter.getCompany() != null && letter.getCompany().getId() != null) {
            letter.setCompany(companyRepository.getReferenceById(letter.getCompany().getId()));
        }
        return resignationRepository.save(letter);
    }

    public ResignationLetter approveResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        r.setStatus(ResignationLetter.ResignationStatus.APPROVED);
        return resignationRepository.save(r);
    }

    public ResignationLetter rejectResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
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
        if (reason.getCompany() != null && reason.getCompany().getId() != null) {
            reason.setCompany(companyRepository.getReferenceById(reason.getCompany().getId()));
        }
        return exitReasonRepository.save(reason);
    }

    public void deleteExitReason(Long id) {
        exitReasonRepository.deleteById(id);
    }

    // ─── Offboarding Plans ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingPlan> listPlans() {
        var spec = ScopeFilter.<OffboardingPlan>byCompany();
        return spec != null ? planRepository.findAll(spec) : planRepository.findAll();
    }

    public OffboardingPlan createPlan(OffboardingPlan plan) {
        if (plan.getCompany() != null && plan.getCompany().getId() != null) {
            plan.setCompany(companyRepository.getReferenceById(plan.getCompany().getId()));
        }
        return planRepository.save(plan);
    }

    public OffboardingPlan updatePlan(Long id, OffboardingPlan updated) {
        OffboardingPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingPlan", id));
        plan.setTitle(updated.getTitle());
        plan.setDescription(updated.getDescription());
        plan.setIsActive(updated.getIsActive());
        return planRepository.save(plan);
    }

    public void deletePlan(Long id) {
        planRepository.deleteById(id);
    }

    // ─── Offboarding Stages ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStage> listStages(Long planId) {
        return stageRepository.findByPlanIdOrderBySequenceAsc(planId);
    }

    public OffboardingStage createStage(Long planId, OffboardingStage stage) {
        stage.setPlan(planRepository.getReferenceById(planId));
        return stageRepository.save(stage);
    }

    public OffboardingStage updateStage(Long id, OffboardingStage updated) {
        OffboardingStage stage = stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingStage", id));
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    public void deleteStage(Long id) {
        stageRepository.deleteById(id);
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStageFile> listStageFiles(Long stageId) {
        return stageFileRepository.findByStageId(stageId);
    }

    public OffboardingStageFile addStageFile(Long stageId, OffboardingStageFile file) {
        file.setStage(stageRepository.getReferenceById(stageId));
        return stageFileRepository.save(file);
    }

    public void deleteStageFile(Long id) {
        stageFileRepository.deleteById(id);
    }

    // ─── Employee Tasks ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingEmployeeTask> listEmployeeTasks(Long offboardingId) {
        return employeeTaskRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingEmployeeTask assignEmployeeTask(Long offboardingId, OffboardingEmployeeTask task) {
        task.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
            task.setAssignedTo(employeeRepository.getReferenceById(task.getAssignedTo().getId()));
        }
        return employeeTaskRepository.save(task);
    }

    public OffboardingEmployeeTask completeEmployeeTask(Long id) {
        OffboardingEmployeeTask task = employeeTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingEmployeeTask", id));
        task.setIsCompleted(true);
        return employeeTaskRepository.save(task);
    }

    // ─── Notes ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingNote> listNotes(Long offboardingId) {
        return noteRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingNote addNote(Long offboardingId, OffboardingNote note) {
        note.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (note.getCreatedBy() != null && note.getCreatedBy().getId() != null) {
            note.setCreatedBy(employeeRepository.getReferenceById(note.getCreatedBy().getId()));
        }
        return noteRepository.save(note);
    }

    public void deleteNote(Long id) {
        noteRepository.deleteById(id);
    }

    // ─── General Settings ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OffboardingGeneralSetting getSettings() {
        Long companyId = com.example.demo.common.context.CompanyContext.get();
        var result = companyId != null
                ? generalSettingRepository.findByCompanyId(companyId)
                : generalSettingRepository.findAll().stream().findFirst();
        return result.orElse(new OffboardingGeneralSetting());
    }

    public OffboardingGeneralSetting upsertSettings(OffboardingGeneralSetting incoming) {
        OffboardingGeneralSetting setting;
        if (incoming.getCompany() != null && incoming.getCompany().getId() != null) {
            setting = generalSettingRepository.findByCompanyId(incoming.getCompany().getId())
                    .orElse(new OffboardingGeneralSetting());
            setting.setCompany(companyRepository.getReferenceById(incoming.getCompany().getId()));
        } else {
            setting = new OffboardingGeneralSetting();
        }
        setting.setNoticePeriodDays(incoming.getNoticePeriodDays());
        setting.setEnableExitInterview(incoming.getEnableExitInterview());
        setting.setEnableAssetReturnCheck(incoming.getEnableAssetReturnCheck());
        setting.setEnableKnowledgeTransfer(incoming.getEnableKnowledgeTransfer());
        return generalSettingRepository.save(setting);
    }
}
