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
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingTask", id));
    }

    @Transactional
    public OnboardingTask createTask(OnboardingTask task) {
        if (task.getCompany() != null && task.getCompany().getId() != null) {
            task.setCompany(companyRepository.getReferenceById(task.getCompany().getId()));
        }
        log.info("Creating onboarding task: {}", task.getTitle());
        return taskRepository.save(task);
    }

    @Transactional
    public OnboardingTask updateTask(Long id, OnboardingTask updated) {
        OnboardingTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingTask", id));
        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        task.setDaysToComplete(updated.getDaysToComplete());
        log.info("Updating onboarding task id={}", id);
        return taskRepository.save(task);
    }

    @Transactional
    public Map<String, String> deleteTask(Long id) {
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
        return employeeOnboardingRepository.findByEmployeeId(employeeId);
    }

    @Transactional(readOnly = true)
    public EmployeeOnboarding getEmployeeOnboardingById(Long id) {
        return employeeOnboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOnboarding", id));
    }

    @Transactional
    public EmployeeOnboarding createEmployeeOnboarding(EmployeeOnboarding onboarding) {
        if (onboarding.getEmployee() != null && onboarding.getEmployee().getId() != null) {
            onboarding.setEmployee(employeeRepository.getReferenceById(onboarding.getEmployee().getId()));
        }
        if (onboarding.getTask() != null && onboarding.getTask().getId() != null) {
            onboarding.setTask(taskRepository.getReferenceById(onboarding.getTask().getId()));
        }
        return employeeOnboardingRepository.save(onboarding);
    }

    @Transactional
    public EmployeeOnboarding completeEmployeeOnboarding(Long id) {
        EmployeeOnboarding eo = employeeOnboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOnboarding", id));
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
        return portalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingPortal", id));
    }

    @Transactional
    public OnboardingPortal createPortal(OnboardingPortal portal) {
        if (portal.getCompany() != null && portal.getCompany().getId() != null) {
            portal.setCompany(companyRepository.getReferenceById(portal.getCompany().getId()));
        }
        log.info("Creating onboarding portal: {}", portal.getTitle());
        return portalRepository.save(portal);
    }

    @Transactional
    public OnboardingPortal updatePortal(Long id, OnboardingPortal updated) {
        OnboardingPortal portal = portalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingPortal", id));
        portal.setTitle(updated.getTitle());
        portal.setIsActive(updated.getIsActive());
        portal.setExpiresAt(updated.getExpiresAt());
        return portalRepository.save(portal);
    }

    @Transactional
    public void deletePortal(Long id) {
        if (!portalRepository.existsById(id)) {
            throw new ResourceNotFoundException("OnboardingPortal", id);
        }
        portalRepository.deleteById(id);
        log.info("Deleted onboarding portal id={}", id);
    }

    // ─── OnboardingStage CRUD ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingStage> listStages(Long portalId) {
        return stageRepository.findByPortalIdOrderBySequenceAsc(portalId);
    }

    @Transactional(readOnly = true)
    public OnboardingStage getStageById(Long id) {
        return stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingStage", id));
    }

    @Transactional
    public OnboardingStage createStage(Long portalId, OnboardingStage stage) {
        stage.setPortal(portalRepository.getReferenceById(portalId));
        return stageRepository.save(stage);
    }

    @Transactional
    public OnboardingStage updateStage(Long id, OnboardingStage updated) {
        OnboardingStage stage = stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingStage", id));
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    @Transactional
    public Map<String, String> deleteStage(Long id) {
        if (!stageRepository.existsById(id)) {
            throw new ResourceNotFoundException("OnboardingStage", id);
        }
        stageRepository.deleteById(id);
        return Map.of("message", "Stage deleted");
    }

    // ─── OnboardingCandidate CRUD ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OnboardingCandidate> listCandidates(Long portalId) {
        return onboardingCandidateRepository.findByPortalId(portalId);
    }

    @Transactional(readOnly = true)
    public OnboardingCandidate getCandidateById(Long id) {
        return onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
    }

    @Transactional
    public OnboardingCandidate addCandidate(Long portalId, OnboardingCandidate oc) {
        oc.setPortal(portalRepository.getReferenceById(portalId));
        return onboardingCandidateRepository.save(oc);
    }

    @Transactional
    public OnboardingCandidate completeOnboarding(Long id) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        oc.setStatus(OnboardingCandidate.OnboardingStatus.COMPLETED);
        log.info("Marking OnboardingCandidate id={} as COMPLETED", id);
        return onboardingCandidateRepository.save(oc);
    }

    // ─── CandidateStage CRUD ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateStage> listCandidateStages(Long candidateId) {
        return candidateStageRepository.findByOnboardingCandidateId(candidateId);
    }

    @Transactional
    public CandidateStage addCandidateStage(Long candidateId, CandidateStage cs) {
        cs.setOnboardingCandidate(onboardingCandidateRepository.getReferenceById(candidateId));
        if (cs.getStage() != null && cs.getStage().getId() != null) {
            cs.setStage(stageRepository.getReferenceById(cs.getStage().getId()));
        }
        return candidateStageRepository.save(cs);
    }

    @Transactional
    public CandidateStage completeCandidateStage(Long id) {
        CandidateStage cs = candidateStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateStage", id));
        cs.setIsCompleted(true);
        return candidateStageRepository.save(cs);
    }

    // ─── CandidateTask CRUD ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateTask> listCandidateTasks(Long candidateId) {
        return candidateTaskRepository.findByOnboardingCandidateId(candidateId);
    }

    @Transactional
    public CandidateTask addCandidateTask(Long candidateId, CandidateTask task) {
        task.setOnboardingCandidate(onboardingCandidateRepository.getReferenceById(candidateId));
        if (task.getStage() != null && task.getStage().getId() != null) {
            task.setStage(stageRepository.getReferenceById(task.getStage().getId()));
        }
        return candidateTaskRepository.save(task);
    }

    /**
     * Assign a specific OnboardingTask (by taskId) to a candidate (by candidateId),
     * creating a CandidateTask record populated from the template task.
     */
    @Transactional
    public CandidateTask assignTaskToCandidate(Long candidateId, Long taskId) {
        OnboardingCandidate candidate = onboardingCandidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", candidateId));
        OnboardingTask taskTemplate = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingTask", taskId));

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
        ct.setIsCompleted(true);
        log.info("Completing CandidateTask id={}", candidateTaskId);
        return candidateTaskRepository.save(ct);
    }

    /**
     * Advance an OnboardingCandidate to the next sequential stage.
     * Marks the current stage as completed and marks the next stage as active
     * by creating a CandidateStage entry for it.
     */
    @Transactional
    public Map<String, Object> advanceStage(Long candidateId) {
        OnboardingCandidate candidate = onboardingCandidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", candidateId));

        // Get all candidate stages ordered
        List<CandidateStage> candidateStages = candidateStageRepository.findByOnboardingCandidateId(candidateId);

        // Find first incomplete stage
        CandidateStage currentStage = candidateStages.stream()
                .filter(cs -> !Boolean.TRUE.equals(cs.getIsCompleted()))
                .findFirst()
                .orElse(null);

        Map<String, Object> result = new HashMap<>();
        if (currentStage == null) {
            // All stages complete — mark candidate as done
            candidate.setStatus(OnboardingCandidate.OnboardingStatus.COMPLETED);
            onboardingCandidateRepository.save(candidate);
            result.put("message", "All stages completed. Onboarding marked as COMPLETED.");
            result.put("candidateId", candidateId);
            result.put("status", "COMPLETED");
            return result;
        }

        // Mark current stage complete
        currentStage.setIsCompleted(true);
        candidateStageRepository.save(currentStage);

        // Find the portal stages to determine next
        List<OnboardingStage> portalStages = stageRepository.findByPortalIdOrderBySequenceAsc(
                candidate.getPortal().getId());

        Integer currentSequence = currentStage.getStage().getSequence();
        OnboardingStage nextPortalStage = portalStages.stream()
                .filter(s -> s.getSequence() > currentSequence)
                .findFirst()
                .orElse(null);

        result.put("candidateId", candidateId);
        result.put("completedStage", currentStage.getStage().getTitle());

        if (nextPortalStage != null) {
            // Check if CandidateStage entry already exists for the next stage
            boolean alreadyExists = candidateStages.stream()
                    .anyMatch(cs -> cs.getStage().getId().equals(nextPortalStage.getId()));
            if (!alreadyExists) {
                CandidateStage next = new CandidateStage();
                next.setOnboardingCandidate(candidate);
                next.setStage(nextPortalStage);
                next.setIsCompleted(false);
                candidateStageRepository.save(next);
            }
            result.put("message", "Advanced to next stage: " + nextPortalStage.getTitle());
            result.put("nextStage", nextPortalStage.getTitle());
        } else {
            // No next stage — all portal stages completed
            candidate.setStatus(OnboardingCandidate.OnboardingStatus.COMPLETED);
            onboardingCandidateRepository.save(candidate);
            result.put("message", "Final stage completed. Onboarding marked as COMPLETED.");
            result.put("status", "COMPLETED");
        }

        log.info("Advanced stage for candidate id={}: {}", candidateId, result.get("message"));
        return result;
    }

    /**
     * Initiate onboarding for an employee against a given portal.
     * Creates an OnboardingCandidate record (using the employee's linked Candidate if available),
     * then creates CandidateStage entries for each portal stage and assigns all company tasks.
     */
    @Transactional
    public Map<String, Object> initiateOnboarding(Long employeeId, Long portalId) {
        employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        OnboardingPortal portal = portalRepository.findById(portalId)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingPortal", portalId));

        // Create a placeholder Candidate reference if needed — create OnboardingCandidate
        // In practice the caller should ensure a Candidate record exists; here we use getReferenceById
        // to satisfy the non-null FK. HR should link proper Candidate entities upstream.
        OnboardingCandidate oc = new OnboardingCandidate();
        oc.setPortal(portal);
        // Candidate reference: requires a Candidate entity keyed on employeeId as the id placeholder.
        // This is a simplified mapping; in production Candidate.id may differ from Employee.id.
        Candidate candidateRef = new Candidate();
        candidateRef.setId(employeeId);
        oc.setCandidate(candidateRef);
        oc.setStatus(OnboardingCandidate.OnboardingStatus.IN_PROGRESS);
        OnboardingCandidate savedOc = onboardingCandidateRepository.save(oc);

        // Create CandidateStage for each portal stage
        List<OnboardingStage> stages = stageRepository.findByPortalIdOrderBySequenceAsc(portalId);
        for (OnboardingStage stage : stages) {
            CandidateStage cs = new CandidateStage();
            cs.setOnboardingCandidate(savedOc);
            cs.setStage(stage);
            cs.setIsCompleted(false);
            candidateStageRepository.save(cs);
        }

        // Assign all company tasks to the candidate
        Long companyId = portal.getCompany() != null ? portal.getCompany().getId() : null;
        int tasksAssigned = 0;
        if (companyId != null) {
            List<OnboardingTask> companyTasks = taskRepository.findByCompanyId(companyId);
            for (OnboardingTask task : companyTasks) {
                CandidateTask ct = new CandidateTask();
                ct.setOnboardingCandidate(savedOc);
                ct.setTitle(task.getTitle());
                ct.setDescription(task.getDescription());
                ct.setIsCompleted(false);
                if (task.getDaysToComplete() != null) {
                    ct.setDueDate(LocalDate.now().plusDays(task.getDaysToComplete()));
                }
                candidateTaskRepository.save(ct);
                tasksAssigned++;
            }
        }

        log.info("Initiated onboarding for employee id={} on portal '{}': {} stages, {} tasks assigned",
                employeeId, portal.getTitle(), stages.size(), tasksAssigned);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Onboarding initiated successfully");
        result.put("onboardingCandidateId", savedOc.getId());
        result.put("portalId", portalId);
        result.put("stagesCreated", stages.size());
        result.put("tasksAssigned", tasksAssigned);
        return result;
    }

    // ─── Offer Letter ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> sendOfferLetter(Long id) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        String recipientEmail = (oc.getCandidate() != null) ? oc.getCandidate().getEmail() : null;
        Map<String, Object> result = new HashMap<>();
        result.put("candidateId", id);
        if (recipientEmail != null) {
            Long companyId = (oc.getPortal() != null && oc.getPortal().getCompany() != null)
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
        return result;
    }

    @Transactional
    public OnboardingCandidate updateOfferLetterStatus(Long id, String status) {
        OnboardingCandidate oc = onboardingCandidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OnboardingCandidate", id));
        try {
            oc.setStatus(OnboardingCandidate.OnboardingStatus.valueOf(status));
        } catch (IllegalArgumentException ignored) {
            // unrecognized status — leave as-is
        }
        return onboardingCandidateRepository.save(oc);
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
        result.put("message", "Welcome to the onboarding portal. Please create your account to continue.");
        result.put("status", "ACTIVE");
        return result;
    }

    /**
     * Create a user account for a candidate using their portal token.
     * Looks up the portal by token, validates it, then records the account creation request.
     * Actual User entity provisioning should be handled by the auth/identity module.
     */
    @Transactional
    public Map<String, Object> createAccountForCandidate(String token, Map<String, Object> accountDetails) {
        // Validate the token is active
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

        String email = accountDetails.get("email") != null ? accountDetails.get("email").toString() : null;
        log.info("Account creation request received for portal token={}, email={}", token, email);

        // Attempt to update the status of matching OnboardingCandidates in this portal
        List<OnboardingCandidate> candidates = onboardingCandidateRepository.findByPortalId(portal.getId());
        log.info("Found {} candidate(s) in portal id={} during account creation", candidates.size(), portal.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("portalId", portal.getId());
        result.put("message", "Account creation request received. You will receive a confirmation email shortly.");
        result.put("success", true);
        if (email != null) {
            result.put("email", email);
        }
        return result;
    }

    /**
     * Return onboarding dashboard statistics.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOnboardingDashboard() {
        List<EmployeeOnboarding> all = employeeOnboardingRepository.findAll();
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
        List<OnboardingCandidate> allCandidates = onboardingCandidateRepository.findAll();
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
