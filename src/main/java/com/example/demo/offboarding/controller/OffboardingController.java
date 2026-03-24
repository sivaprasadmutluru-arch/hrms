package com.example.demo.offboarding.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.offboarding.entity.*;
import com.example.demo.offboarding.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offboarding")
@RequiredArgsConstructor
@Tag(name = "Offboarding")
public class OffboardingController {

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

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('offboarding:view')")
    public ResponseEntity<List<EmployeeOffboarding>> getEmployeeOffboarding(@PathVariable Long employeeId) {
        return ResponseEntity.ok(offboardingRepository.findByEmployeeId(employeeId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('offboarding:create')")
    public ResponseEntity<EmployeeOffboarding> create(@RequestBody EmployeeOffboarding offboarding) {
        return ResponseEntity.ok(offboardingRepository.save(offboarding));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('offboarding:edit')")
    public ResponseEntity<EmployeeOffboarding> complete(@PathVariable Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        eo.setStatus(EmployeeOffboarding.OffboardingStatus.COMPLETED);
        return ResponseEntity.ok(offboardingRepository.save(eo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offboardingRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Resignation Letters ─────────────────────────────────────────────────

    @GetMapping("/resignations")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List resignation letters (company-scoped)")
    public ResponseEntity<List<ResignationLetter>> listResignations() {
        var spec = ScopeFilter.<ResignationLetter>byEmployee();
        return ResponseEntity.ok(spec != null ? resignationRepository.findAll(spec) : resignationRepository.findAll());
    }

    @PostMapping("/resignations")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Transactional
    @Operation(summary = "Submit a resignation letter")
    public ResponseEntity<ResignationLetter> createResignation(@RequestBody ResignationLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getId() != null) {
            letter.setEmployee(employeeRepository.getReferenceById(letter.getEmployee().getId()));
        }
        if (letter.getCompany() != null && letter.getCompany().getId() != null) {
            letter.setCompany(companyRepository.getReferenceById(letter.getCompany().getId()));
        }
        return ResponseEntity.ok(resignationRepository.save(letter));
    }

    @PostMapping("/resignations/{id}/approve")
    @PreAuthorize("hasAuthority('offboarding:approve')")
    @Transactional
    @Operation(summary = "Approve a resignation letter")
    public ResponseEntity<ResignationLetter> approveResignation(@PathVariable Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        r.setStatus(ResignationLetter.ResignationStatus.APPROVED);
        return ResponseEntity.ok(resignationRepository.save(r));
    }

    @PostMapping("/resignations/{id}/reject")
    @PreAuthorize("hasAuthority('offboarding:approve')")
    @Transactional
    @Operation(summary = "Reject a resignation letter")
    public ResponseEntity<ResignationLetter> rejectResignation(@PathVariable Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        r.setStatus(ResignationLetter.ResignationStatus.REJECTED);
        return ResponseEntity.ok(resignationRepository.save(r));
    }

    // ─── Exit Reasons ─────────────────────────────────────────────────────────

    @GetMapping("/exit-reasons")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List exit reasons (company-scoped)")
    public ResponseEntity<List<ExitReason>> listExitReasons() {
        var spec = ScopeFilter.<ExitReason>byCompany();
        return ResponseEntity.ok(spec != null ? exitReasonRepository.findAll(spec) : exitReasonRepository.findAll());
    }

    @PostMapping("/exit-reasons")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Transactional
    @Operation(summary = "Create an exit reason")
    public ResponseEntity<ExitReason> createExitReason(@RequestBody ExitReason reason) {
        if (reason.getCompany() != null && reason.getCompany().getId() != null) {
            reason.setCompany(companyRepository.getReferenceById(reason.getCompany().getId()));
        }
        return ResponseEntity.ok(exitReasonRepository.save(reason));
    }

    @DeleteMapping("/exit-reasons/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an exit reason")
    public ResponseEntity<Map<String, String>> deleteExitReason(@PathVariable Long id) {
        exitReasonRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Exit reason deleted"));
    }

    // ─── Offboarding Plans ────────────────────────────────────────────────────

    @GetMapping("/plans")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List offboarding plans (company-scoped)")
    public ResponseEntity<List<OffboardingPlan>> listPlans() {
        var spec = ScopeFilter.<OffboardingPlan>byCompany();
        return ResponseEntity.ok(spec != null ? planRepository.findAll(spec) : planRepository.findAll());
    }

    @PostMapping("/plans")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an offboarding plan")
    public ResponseEntity<OffboardingPlan> createPlan(@RequestBody OffboardingPlan plan) {
        if (plan.getCompany() != null && plan.getCompany().getId() != null) {
            plan.setCompany(companyRepository.getReferenceById(plan.getCompany().getId()));
        }
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @PutMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an offboarding plan")
    public ResponseEntity<OffboardingPlan> updatePlan(@PathVariable Long id, @RequestBody OffboardingPlan updated) {
        OffboardingPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingPlan", id));
        plan.setTitle(updated.getTitle());
        plan.setDescription(updated.getDescription());
        plan.setIsActive(updated.getIsActive());
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @DeleteMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an offboarding plan")
    public ResponseEntity<Map<String, String>> deletePlan(@PathVariable Long id) {
        planRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Plan deleted"));
    }

    // ─── Offboarding Stages ───────────────────────────────────────────────────

    @GetMapping("/plans/{planId}/stages")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List stages for an offboarding plan")
    public ResponseEntity<List<OffboardingStage>> listStages(@PathVariable Long planId) {
        return ResponseEntity.ok(stageRepository.findByPlanIdOrderBySequenceAsc(planId));
    }

    @PostMapping("/plans/{planId}/stages")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a stage for an offboarding plan")
    public ResponseEntity<OffboardingStage> createStage(@PathVariable Long planId, @RequestBody OffboardingStage stage) {
        stage.setPlan(planRepository.getReferenceById(planId));
        return ResponseEntity.ok(stageRepository.save(stage));
    }

    @PutMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an offboarding stage")
    public ResponseEntity<OffboardingStage> updateStage(@PathVariable Long id, @RequestBody OffboardingStage updated) {
        OffboardingStage stage = stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingStage", id));
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return ResponseEntity.ok(stageRepository.save(stage));
    }

    @DeleteMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an offboarding stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long id) {
        stageRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Stage deleted"));
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @GetMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List files for an offboarding stage")
    public ResponseEntity<List<OffboardingStageFile>> listStageFiles(@PathVariable Long stageId) {
        return ResponseEntity.ok(stageFileRepository.findByStageId(stageId));
    }

    @PostMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Transactional
    @Operation(summary = "Attach a file to an offboarding stage")
    public ResponseEntity<OffboardingStageFile> addStageFile(@PathVariable Long stageId,
                                                              @RequestBody OffboardingStageFile file) {
        file.setStage(stageRepository.getReferenceById(stageId));
        return ResponseEntity.ok(stageFileRepository.save(file));
    }

    @DeleteMapping("/stage-files/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an offboarding stage file")
    public ResponseEntity<Void> deleteStageFile(@PathVariable Long id) {
        stageFileRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Employee Offboarding Tasks ───────────────────────────────────────────

    @GetMapping("/employee-offboarding/{offboardingId}/tasks")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List tasks for an employee offboarding")
    public ResponseEntity<List<OffboardingEmployeeTask>> listEmployeeTasks(@PathVariable Long offboardingId) {
        return ResponseEntity.ok(employeeTaskRepository.findByEmployeeOffboardingId(offboardingId));
    }

    @PostMapping("/employee-offboarding/{offboardingId}/tasks")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Assign a task to an employee offboarding")
    public ResponseEntity<OffboardingEmployeeTask> assignEmployeeTask(@PathVariable Long offboardingId,
                                                                       @RequestBody OffboardingEmployeeTask task) {
        task.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
            task.setAssignedTo(employeeRepository.getReferenceById(task.getAssignedTo().getId()));
        }
        return ResponseEntity.ok(employeeTaskRepository.save(task));
    }

    @PutMapping("/employee-tasks/{id}/complete")
    @PreAuthorize("hasAuthority('offboarding:edit')")
    @Transactional
    @Operation(summary = "Mark an employee offboarding task as completed")
    public ResponseEntity<OffboardingEmployeeTask> completeEmployeeTask(@PathVariable Long id) {
        OffboardingEmployeeTask task = employeeTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingEmployeeTask", id));
        task.setIsCompleted(true);
        return ResponseEntity.ok(employeeTaskRepository.save(task));
    }

    // ─── Offboarding Notes ────────────────────────────────────────────────────

    @GetMapping("/employee-offboarding/{offboardingId}/notes")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List notes for an employee offboarding")
    public ResponseEntity<List<OffboardingNote>> listNotes(@PathVariable Long offboardingId) {
        return ResponseEntity.ok(noteRepository.findByEmployeeOffboardingId(offboardingId));
    }

    @PostMapping("/employee-offboarding/{offboardingId}/notes")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Transactional
    @Operation(summary = "Add a note to an employee offboarding")
    public ResponseEntity<OffboardingNote> addNote(@PathVariable Long offboardingId,
                                                    @RequestBody OffboardingNote note) {
        note.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (note.getCreatedBy() != null && note.getCreatedBy().getId() != null) {
            note.setCreatedBy(employeeRepository.getReferenceById(note.getCreatedBy().getId()));
        }
        return ResponseEntity.ok(noteRepository.save(note));
    }

    @DeleteMapping("/notes/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an offboarding note")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Offboarding General Settings ─────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get offboarding general settings for current company")
    public ResponseEntity<OffboardingGeneralSetting> getSettings() {
        Long companyId = com.example.demo.common.context.CompanyContext.get();
        var result = companyId != null
                ? generalSettingRepository.findByCompanyId(companyId)
                : generalSettingRepository.findAll().stream().findFirst();
        return ResponseEntity.ok(result.orElse(new OffboardingGeneralSetting()));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert offboarding general settings")
    public ResponseEntity<OffboardingGeneralSetting> upsertSettings(@RequestBody OffboardingGeneralSetting incoming) {
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
        return ResponseEntity.ok(generalSettingRepository.save(setting));
    }
}
