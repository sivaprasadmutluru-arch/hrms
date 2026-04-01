package com.example.demo.onboarding.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
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

import java.util.HashMap;
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
    private final EmailService emailService;

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

    // ─── Offer Letter ─────────────────────────────────────────────────────────

    @PostMapping("/candidates/{id}/offer-letter/send")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Send offer letter email to an onboarding candidate")
    public ResponseEntity<Map<String, Object>> sendOfferLetter(@PathVariable Long id) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        String recipientEmail = null;
        if (oc.getCandidate() != null && oc.getCandidate().getEmail() != null) {
            recipientEmail = oc.getCandidate().getEmail();
        }
        Map<String, Object> result = new HashMap<>();
        result.put("candidateId", id);
        if (recipientEmail != null) {
            Long companyId = oc.getPortal() != null && oc.getPortal().getCompany() != null
                    ? oc.getPortal().getCompany().getId() : null;
            emailService.sendEmail(companyId, recipientEmail,
                    "Your Offer Letter",
                    "<p>Congratulations! Please find your offer letter attached.</p>",
                    null);
            result.put("message", "Offer letter sent to " + recipientEmail);
            result.put("email", recipientEmail);
        } else {
            result.put("message", "Offer letter queued (no email address found for candidate)");
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/candidates/{id}/offer-letter/status")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update offer letter status for an onboarding candidate")
    public ResponseEntity<OnboardingCandidate> updateOfferLetterStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        try {
            oc.setStatus(OnboardingCandidate.OnboardingStatus.valueOf(status));
        } catch (IllegalArgumentException e) {
            // Status value not recognized – leave as-is and return the record
        }
        return ResponseEntity.ok(onboardingCandidateRepository.save(oc));
    }

    // ─── Onboarding Portal (Public) ───────────────────────────────────────────

    @GetMapping("/portal/{token}/welcome")
    @Operation(summary = "Public portal welcome page (stub)")
    public ResponseEntity<Map<String, Object>> portalWelcome(@PathVariable String token) {
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("message", "Welcome to the onboarding portal. Please create your account to continue.");
        result.put("status", "ACTIVE");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/portal/{token}/create-account")
    @Operation(summary = "Public portal account creation (stub)")
    public ResponseEntity<Map<String, Object>> portalCreateAccount(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("message", "Account creation request received. You will receive a confirmation email shortly.");
        result.put("success", true);
        return ResponseEntity.ok(result);
    }

    // ─── Onboarding Dashboard ─────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Onboarding dashboard KPIs")
    public ResponseEntity<Map<String, Object>> onboardingDashboard(@RequestParam(required = false) Long companyId) {
        List<EmployeeOnboarding> all = employeeOnboardingRepository.findAll();
        long total = all.size();
        long completed = all.stream()
                .filter(o -> EmployeeOnboarding.OnboardingStatus.COMPLETED.equals(o.getStatus()))
                .count();
        long pending = all.stream()
                .filter(o -> EmployeeOnboarding.OnboardingStatus.PENDING.equals(o.getStatus())
                        || EmployeeOnboarding.OnboardingStatus.IN_PROGRESS.equals(o.getStatus()))
                .count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalOnboarding", total);
        result.put("completedOnboarding", completed);
        result.put("pendingOnboarding", pending);
        return ResponseEntity.ok(result);
    }
}
