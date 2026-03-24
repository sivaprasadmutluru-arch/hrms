package com.example.demo.onboarding.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.onboarding.entity.*;
import com.example.demo.onboarding.repository.*;
import com.example.demo.recruitment.entity.Candidate;
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
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
@Tag(name = "Onboarding")
public class OnboardingController {

    private final OnboardingTaskRepository taskRepository;
    private final EmployeeOnboardingRepository employeeOnboardingRepository;
    private final OnboardingPortalRepository portalRepository;
    private final CompanyRepository companyRepository;
    private final OnboardingStageRepository stageRepository;
    private final OnboardingCandidateRepository onboardingCandidateRepository;
    private final CandidateStageRepository candidateStageRepository;
    private final CandidateTaskRepository candidateTaskRepository;

    @GetMapping("/tasks")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public ResponseEntity<List<OnboardingTask>> listTasks() {
        var spec = ScopeFilter.<OnboardingTask>byCompany();
        return ResponseEntity.ok(spec != null ? taskRepository.findAll(spec) : taskRepository.findAll());
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasAuthority('onboarding:create')")
    public ResponseEntity<OnboardingTask> createTask(@RequestBody OnboardingTask task) {
        return ResponseEntity.ok(taskRepository.save(task));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public ResponseEntity<List<EmployeeOnboarding>> getEmployeeOnboarding(@PathVariable Long employeeId) {
        return ResponseEntity.ok(employeeOnboardingRepository.findByEmployeeId(employeeId));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAuthority('onboarding:create')")
    public ResponseEntity<EmployeeOnboarding> assign(@RequestBody EmployeeOnboarding onboarding) {
        return ResponseEntity.ok(employeeOnboardingRepository.save(onboarding));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:edit')")
    public ResponseEntity<EmployeeOnboarding> complete(@PathVariable Long id) {
        EmployeeOnboarding eo = employeeOnboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOnboarding", id));
        eo.setStatus(EmployeeOnboarding.OnboardingStatus.COMPLETED);
        return ResponseEntity.ok(employeeOnboardingRepository.save(eo));
    }

    // ─── Onboarding Portals ──────────────────────────────────────────────────

    @GetMapping("/portals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List onboarding portals (company-scoped)")
    public ResponseEntity<List<OnboardingPortal>> listPortals() {
        var spec = ScopeFilter.<OnboardingPortal>byCompany();
        return ResponseEntity.ok(spec != null ? portalRepository.findAll(spec) : portalRepository.findAll());
    }

    @PostMapping("/portals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an onboarding portal")
    public ResponseEntity<OnboardingPortal> createPortal(@RequestBody OnboardingPortal portal) {
        if (portal.getCompany() != null && portal.getCompany().getId() != null) {
            portal.setCompany(companyRepository.getReferenceById(portal.getCompany().getId()));
        }
        return ResponseEntity.ok(portalRepository.save(portal));
    }

    @PutMapping("/portals/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an onboarding portal")
    public ResponseEntity<OnboardingPortal> updatePortal(@PathVariable Long id, @RequestBody OnboardingPortal updated) {
        OnboardingPortal portal = portalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingPortal", id));
        portal.setTitle(updated.getTitle());
        portal.setIsActive(updated.getIsActive());
        portal.setExpiresAt(updated.getExpiresAt());
        return ResponseEntity.ok(portalRepository.save(portal));
    }

    @DeleteMapping("/portals/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an onboarding portal")
    public ResponseEntity<Void> deletePortal(@PathVariable Long id) {
        portalRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Onboarding Stages ────────────────────────────────────────────────────

    @GetMapping("/portals/{portalId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List stages for a portal")
    public ResponseEntity<List<OnboardingStage>> listStages(@PathVariable Long portalId) {
        return ResponseEntity.ok(stageRepository.findByPortalIdOrderBySequenceAsc(portalId));
    }

    @PostMapping("/portals/{portalId}/stages")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a stage for a portal")
    public ResponseEntity<OnboardingStage> createStage(@PathVariable Long portalId, @RequestBody OnboardingStage stage) {
        stage.setPortal(portalRepository.getReferenceById(portalId));
        return ResponseEntity.ok(stageRepository.save(stage));
    }

    @PutMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a stage")
    public ResponseEntity<OnboardingStage> updateStage(@PathVariable Long id, @RequestBody OnboardingStage updated) {
        OnboardingStage s = stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingStage", id));
        s.setTitle(updated.getTitle());
        s.setSequence(updated.getSequence());
        return ResponseEntity.ok(stageRepository.save(s));
    }

    @DeleteMapping("/stages/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long id) {
        stageRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Stage deleted"));
    }

    // ─── Onboarding Candidates ────────────────────────────────────────────────

    @GetMapping("/portals/{portalId}/candidates")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List candidates in a portal")
    public ResponseEntity<List<OnboardingCandidate>> listCandidates(@PathVariable Long portalId) {
        return ResponseEntity.ok(onboardingCandidateRepository.findByPortalId(portalId));
    }

    @PostMapping("/portals/{portalId}/candidates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add a candidate to a portal")
    public ResponseEntity<OnboardingCandidate> addCandidate(@PathVariable Long portalId,
                                                             @RequestBody OnboardingCandidate oc) {
        oc.setPortal(portalRepository.getReferenceById(portalId));
        return ResponseEntity.ok(onboardingCandidateRepository.save(oc));
    }

    @PutMapping("/candidates/{id}/complete")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Mark onboarding as completed for a candidate")
    public ResponseEntity<OnboardingCandidate> completeOnboarding(@PathVariable Long id) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        oc.setStatus(OnboardingCandidate.OnboardingStatus.COMPLETED);
        return ResponseEntity.ok(onboardingCandidateRepository.save(oc));
    }

    // ─── Candidate Stage Progress ─────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "Get stage progress for an onboarding candidate")
    public ResponseEntity<List<CandidateStage>> listCandidateStages(@PathVariable Long candidateId) {
        return ResponseEntity.ok(candidateStageRepository.findByOnboardingCandidateId(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/stages")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Transactional
    @Operation(summary = "Add stage progress for an onboarding candidate")
    public ResponseEntity<CandidateStage> addCandidateStage(@PathVariable Long candidateId,
                                                              @RequestBody CandidateStage cs) {
        cs.setOnboardingCandidate(onboardingCandidateRepository.getReferenceById(candidateId));
        if (cs.getStage() != null && cs.getStage().getId() != null) {
            cs.setStage(stageRepository.getReferenceById(cs.getStage().getId()));
        }
        return ResponseEntity.ok(candidateStageRepository.save(cs));
    }

    @PutMapping("/candidate-stages/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Transactional
    @Operation(summary = "Mark a candidate stage as completed")
    public ResponseEntity<CandidateStage> completeCandidateStage(@PathVariable Long id) {
        CandidateStage cs = candidateStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateStage", id));
        cs.setIsCompleted(true);
        return ResponseEntity.ok(candidateStageRepository.save(cs));
    }

    // ─── Candidate Tasks ──────────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/tasks")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Operation(summary = "List tasks for an onboarding candidate")
    public ResponseEntity<List<CandidateTask>> listCandidateTasks(@PathVariable Long candidateId) {
        return ResponseEntity.ok(candidateTaskRepository.findByOnboardingCandidateId(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/tasks")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Assign a task to an onboarding candidate")
    public ResponseEntity<CandidateTask> assignTask(@PathVariable Long candidateId, @RequestBody CandidateTask task) {
        task.setOnboardingCandidate(onboardingCandidateRepository.getReferenceById(candidateId));
        if (task.getStage() != null && task.getStage().getId() != null) {
            task.setStage(stageRepository.getReferenceById(task.getStage().getId()));
        }
        return ResponseEntity.ok(candidateTaskRepository.save(task));
    }

    @PutMapping("/candidate-tasks/{id}/complete")
    @PreAuthorize("hasAuthority('onboarding:view')")
    @Transactional
    @Operation(summary = "Mark a candidate task as completed")
    public ResponseEntity<CandidateTask> completeCandidateTask(@PathVariable Long id) {
        CandidateTask ct = candidateTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateTask", id));
        ct.setIsCompleted(true);
        return ResponseEntity.ok(candidateTaskRepository.save(ct));
    }
}
