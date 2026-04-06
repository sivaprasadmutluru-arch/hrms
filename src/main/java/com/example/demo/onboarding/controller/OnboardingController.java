package com.example.demo.onboarding.controller;

import com.example.demo.onboarding.entity.*;
import com.example.demo.onboarding.service.OnboardingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
@Tag(name = "Onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping("/tasks")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public ResponseEntity<List<OnboardingTask>> listTasks() {
        return ResponseEntity.ok(onboardingService.listTasks());
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasAuthority('onboarding:create')")
    public ResponseEntity<OnboardingTask> createTask(@RequestBody OnboardingTask task) {
        return ResponseEntity.ok(onboardingService.createTask(task));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public ResponseEntity<List<EmployeeOnboarding>> getEmployeeOnboarding(@PathVariable Long employeeId) {
        return ResponseEntity.ok(onboardingService.getEmployeeOnboarding(employeeId));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAuthority('onboarding:create')")
    public ResponseEntity<EmployeeOnboarding> assign(@RequestBody EmployeeOnboarding onboarding) {
        return ResponseEntity.ok(onboardingService.createEmployeeOnboarding(onboarding));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:edit')")
    public ResponseEntity<EmployeeOnboarding> complete(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.completeEmployeeOnboarding(id));
    }

    // ─── Onboarding Portals ──────────────────────────────────────────────────

    @GetMapping("/portals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "List onboarding portals (company-scoped)")
    public ResponseEntity<List<OnboardingPortal>> listPortals() {
        return ResponseEntity.ok(onboardingService.listPortals());
    }

    @PostMapping("/portals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create an onboarding portal")
    public ResponseEntity<OnboardingPortal> createPortal(@RequestBody OnboardingPortal portal) {
        return ResponseEntity.ok(onboardingService.createPortal(portal));
    }

    @PutMapping("/portals/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update an onboarding portal")
    public ResponseEntity<OnboardingPortal> updatePortal(@PathVariable Long id, @RequestBody OnboardingPortal updated) {
        return ResponseEntity.ok(onboardingService.updatePortal(id, updated));
    }

    @DeleteMapping("/portals/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an onboarding portal")
    public ResponseEntity<Void> deletePortal(@PathVariable Long id) {
        onboardingService.deletePortal(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Onboarding Stages ────────────────────────────────────────────────────

    @GetMapping("/portals/{portalId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List stages for a portal")
    public ResponseEntity<List<OnboardingStage>> listStages(@PathVariable Long portalId) {
        return ResponseEntity.ok(onboardingService.listStages(portalId));
    }

    @PostMapping("/portals/{portalId}/stages")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a stage for a portal")
    public ResponseEntity<OnboardingStage> createStage(@PathVariable Long portalId, @RequestBody OnboardingStage stage) {
        return ResponseEntity.ok(onboardingService.createStage(portalId, stage));
    }

    @PutMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a stage")
    public ResponseEntity<OnboardingStage> updateStage(@PathVariable Long id, @RequestBody OnboardingStage updated) {
        return ResponseEntity.ok(onboardingService.updateStage(id, updated));
    }

    @DeleteMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.deleteStage(id));
    }

    // ─── Onboarding Candidates ────────────────────────────────────────────────

    @GetMapping("/portals/{portalId}/candidates")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List candidates in a portal")
    public ResponseEntity<List<OnboardingCandidate>> listCandidates(@PathVariable Long portalId) {
        return ResponseEntity.ok(onboardingService.listCandidates(portalId));
    }

    @PostMapping("/portals/{portalId}/candidates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Add a candidate to a portal")
    public ResponseEntity<OnboardingCandidate> addCandidate(@PathVariable Long portalId,
                                                             @RequestBody OnboardingCandidate oc) {
        return ResponseEntity.ok(onboardingService.addCandidate(portalId, oc));
    }

    @PutMapping("/candidates/{id}/complete")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Mark onboarding as completed for a candidate")
    public ResponseEntity<OnboardingCandidate> completeOnboarding(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.completeOnboarding(id));
    }

    // ─── Candidate Stage Progress ─────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "Get stage progress for an onboarding candidate")
    public ResponseEntity<List<CandidateStage>> listCandidateStages(@PathVariable Long candidateId) {
        return ResponseEntity.ok(onboardingService.listCandidateStages(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "Add stage progress for an onboarding candidate")
    public ResponseEntity<CandidateStage> addCandidateStage(@PathVariable Long candidateId,
                                                              @RequestBody CandidateStage cs) {
        return ResponseEntity.ok(onboardingService.addCandidateStage(candidateId, cs));
    }

    @PutMapping("/candidate-stages/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "Mark a candidate stage as completed")
    public ResponseEntity<CandidateStage> completeCandidateStage(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.completeCandidateStage(id));
    }

    // ─── Candidate Tasks ──────────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/tasks")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List tasks for an onboarding candidate")
    public ResponseEntity<List<CandidateTask>> listCandidateTasks(@PathVariable Long candidateId) {
        return ResponseEntity.ok(onboardingService.listCandidateTasks(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/tasks")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Assign a task to an onboarding candidate")
    public ResponseEntity<CandidateTask> assignTask(@PathVariable Long candidateId, @RequestBody CandidateTask task) {
        return ResponseEntity.ok(onboardingService.addCandidateTask(candidateId, task));
    }

    @PutMapping("/candidate-tasks/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "Mark a candidate task as completed")
    public ResponseEntity<CandidateTask> completeCandidateTask(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.completeTask(id));
    }

    // ─── Offer Letter ─────────────────────────────────────────────────────────

    @PostMapping("/candidates/{id}/offer-letter/send")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Send offer letter email to an onboarding candidate")
    public ResponseEntity<Map<String, Object>> sendOfferLetter(@PathVariable Long id) {
        return ResponseEntity.ok(onboardingService.sendOfferLetter(id));
    }

    @PutMapping("/candidates/{id}/offer-letter/status")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update offer letter status for an onboarding candidate")
    public ResponseEntity<OnboardingCandidate> updateOfferLetterStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(onboardingService.updateOfferLetterStatus(id, status));
    }

    // ─── Onboarding Portal (Public) ───────────────────────────────────────────

    @GetMapping("/portal/{token}/welcome")
    @Operation(summary = "Public portal welcome page")
    public ResponseEntity<Map<String, Object>> portalWelcome(@PathVariable String token) {
        return ResponseEntity.ok(onboardingService.getPortalByToken(token));
    }

    @PostMapping("/portal/{token}/create-account")
    @Operation(summary = "Public portal account creation")
    public ResponseEntity<Map<String, Object>> portalCreateAccount(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(onboardingService.createAccountForCandidate(token, body));
    }

    // ─── Onboarding Dashboard ─────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Onboarding dashboard KPIs")
    public ResponseEntity<Map<String, Object>> onboardingDashboard() {
        return ResponseEntity.ok(onboardingService.getOnboardingDashboard());
    }
}
