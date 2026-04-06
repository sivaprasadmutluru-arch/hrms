package com.example.demo.offboarding.controller;

import com.example.demo.offboarding.entity.*;
import com.example.demo.offboarding.service.OffboardingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offboarding")
@RequiredArgsConstructor
@Tag(name = "Offboarding")
public class OffboardingController {

    private final OffboardingService offboardingService;

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('offboarding:view')")
    public ResponseEntity<List<EmployeeOffboarding>> getEmployeeOffboarding(@PathVariable Long employeeId) {
        return ResponseEntity.ok(offboardingService.getByEmployee(employeeId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('offboarding:create')")
    public ResponseEntity<EmployeeOffboarding> create(@RequestBody EmployeeOffboarding offboarding) {
        return ResponseEntity.ok(offboardingService.create(offboarding));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('offboarding:edit')")
    public ResponseEntity<EmployeeOffboarding> complete(@PathVariable Long id) {
        return ResponseEntity.ok(offboardingService.complete(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offboardingService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Resignation Letters ─────────────────────────────────────────────────

    @GetMapping("/resignations")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List resignation letters (company-scoped)")
    public ResponseEntity<List<ResignationLetter>> listResignations() {
        return ResponseEntity.ok(offboardingService.listResignations());
    }

    @PostMapping("/resignations")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Operation(summary = "Submit a resignation letter")
    public ResponseEntity<ResignationLetter> createResignation(@RequestBody ResignationLetter letter) {
        return ResponseEntity.ok(offboardingService.createResignation(letter));
    }

    @PostMapping("/resignations/{id}/approve")
    @PreAuthorize("hasAuthority('offboarding:approve')")
    @Operation(summary = "Approve a resignation letter")
    public ResponseEntity<ResignationLetter> approveResignation(@PathVariable Long id) {
        return ResponseEntity.ok(offboardingService.approveResignation(id));
    }

    @PostMapping("/resignations/{id}/reject")
    @PreAuthorize("hasAuthority('offboarding:approve')")
    @Operation(summary = "Reject a resignation letter")
    public ResponseEntity<ResignationLetter> rejectResignation(@PathVariable Long id) {
        return ResponseEntity.ok(offboardingService.rejectResignation(id));
    }

    // ─── Exit Reasons ─────────────────────────────────────────────────────────

    @GetMapping("/exit-reasons")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List exit reasons (company-scoped)")
    public ResponseEntity<List<ExitReason>> listExitReasons() {
        return ResponseEntity.ok(offboardingService.listExitReasons());
    }

    @PostMapping("/exit-reasons")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Operation(summary = "Create an exit reason")
    public ResponseEntity<ExitReason> createExitReason(@RequestBody ExitReason reason) {
        return ResponseEntity.ok(offboardingService.createExitReason(reason));
    }

    @DeleteMapping("/exit-reasons/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an exit reason")
    public ResponseEntity<Map<String, String>> deleteExitReason(@PathVariable Long id) {
        offboardingService.deleteExitReason(id);
        return ResponseEntity.ok(Map.of("message", "Exit reason deleted"));
    }

    // ─── Offboarding Plans ────────────────────────────────────────────────────

    @GetMapping("/plans")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List offboarding plans (company-scoped)")
    public ResponseEntity<List<OffboardingPlan>> listPlans() {
        return ResponseEntity.ok(offboardingService.listPlans());
    }

    @PostMapping("/plans")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create an offboarding plan")
    public ResponseEntity<OffboardingPlan> createPlan(@RequestBody OffboardingPlan plan) {
        return ResponseEntity.ok(offboardingService.createPlan(plan));
    }

    @PutMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update an offboarding plan")
    public ResponseEntity<OffboardingPlan> updatePlan(@PathVariable Long id, @RequestBody OffboardingPlan updated) {
        return ResponseEntity.ok(offboardingService.updatePlan(id, updated));
    }

    @DeleteMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an offboarding plan")
    public ResponseEntity<Map<String, String>> deletePlan(@PathVariable Long id) {
        offboardingService.deletePlan(id);
        return ResponseEntity.ok(Map.of("message", "Plan deleted"));
    }

    // ─── Offboarding Stages ───────────────────────────────────────────────────

    @GetMapping("/plans/{planId}/stages")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List stages for an offboarding plan")
    public ResponseEntity<List<OffboardingStage>> listStages(@PathVariable Long planId) {
        return ResponseEntity.ok(offboardingService.listStages(planId));
    }

    @PostMapping("/plans/{planId}/stages")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a stage for an offboarding plan")
    public ResponseEntity<OffboardingStage> createStage(@PathVariable Long planId, @RequestBody OffboardingStage stage) {
        return ResponseEntity.ok(offboardingService.createStage(planId, stage));
    }

    @PutMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update an offboarding stage")
    public ResponseEntity<OffboardingStage> updateStage(@PathVariable Long id, @RequestBody OffboardingStage updated) {
        return ResponseEntity.ok(offboardingService.updateStage(id, updated));
    }

    @DeleteMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an offboarding stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long id) {
        offboardingService.deleteStage(id);
        return ResponseEntity.ok(Map.of("message", "Stage deleted"));
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @GetMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List files for an offboarding stage")
    public ResponseEntity<List<OffboardingStageFile>> listStageFiles(@PathVariable Long stageId) {
        return ResponseEntity.ok(offboardingService.listStageFiles(stageId));
    }

    @PostMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Operation(summary = "Attach a file to an offboarding stage")
    public ResponseEntity<OffboardingStageFile> addStageFile(@PathVariable Long stageId,
                                                              @RequestBody OffboardingStageFile file) {
        return ResponseEntity.ok(offboardingService.addStageFile(stageId, file));
    }

    @DeleteMapping("/stage-files/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an offboarding stage file")
    public ResponseEntity<Void> deleteStageFile(@PathVariable Long id) {
        offboardingService.deleteStageFile(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Employee Offboarding Tasks ───────────────────────────────────────────

    @GetMapping("/employee-offboarding/{offboardingId}/tasks")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List tasks for an employee offboarding")
    public ResponseEntity<List<OffboardingEmployeeTask>> listEmployeeTasks(@PathVariable Long offboardingId) {
        return ResponseEntity.ok(offboardingService.listEmployeeTasks(offboardingId));
    }

    @PostMapping("/employee-offboarding/{offboardingId}/tasks")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Assign a task to an employee offboarding")
    public ResponseEntity<OffboardingEmployeeTask> assignEmployeeTask(@PathVariable Long offboardingId,
                                                                       @RequestBody OffboardingEmployeeTask task) {
        return ResponseEntity.ok(offboardingService.assignEmployeeTask(offboardingId, task));
    }

    @PutMapping("/employee-tasks/{id}/complete")
    @PreAuthorize("hasAuthority('offboarding:edit')")
    @Operation(summary = "Mark an employee offboarding task as completed")
    public ResponseEntity<OffboardingEmployeeTask> completeEmployeeTask(@PathVariable Long id) {
        return ResponseEntity.ok(offboardingService.completeEmployeeTask(id));
    }

    // ─── Offboarding Notes ────────────────────────────────────────────────────

    @GetMapping("/employee-offboarding/{offboardingId}/notes")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "List notes for an employee offboarding")
    public ResponseEntity<List<OffboardingNote>> listNotes(@PathVariable Long offboardingId) {
        return ResponseEntity.ok(offboardingService.listNotes(offboardingId));
    }

    @PostMapping("/employee-offboarding/{offboardingId}/notes")
    @PreAuthorize("hasAuthority('offboarding:create')")
    @Operation(summary = "Add a note to an employee offboarding")
    public ResponseEntity<OffboardingNote> addNote(@PathVariable Long offboardingId,
                                                    @RequestBody OffboardingNote note) {
        return ResponseEntity.ok(offboardingService.addNote(offboardingId, note));
    }

    @DeleteMapping("/notes/{id}")
    @PreAuthorize("hasAuthority('offboarding:delete')")
    @Operation(summary = "Delete an offboarding note")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        offboardingService.deleteNote(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Offboarding General Settings ─────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('offboarding:view')")
    @Operation(summary = "Get offboarding general settings for current company")
    public ResponseEntity<OffboardingGeneralSetting> getSettings() {
        return ResponseEntity.ok(offboardingService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Upsert offboarding general settings")
    public ResponseEntity<OffboardingGeneralSetting> upsertSettings(@RequestBody OffboardingGeneralSetting incoming) {
        return ResponseEntity.ok(offboardingService.upsertSettings(incoming));
    }
}
