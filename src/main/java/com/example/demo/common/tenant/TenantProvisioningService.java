package com.example.demo.common.tenant;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Durable state machine for tenant setup.  The HTTP account-creation request
 * only enqueues work; it never holds a database transaction while Hibernate
 * creates tenant tables.  Every state transition is persisted in public so a
 * restart cannot turn a partially-created client into an invisible failure.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantProvisioningService {

    private static final int MAX_ERROR_LENGTH = 3900;
    // Hibernate DDL can be slow on a busy production database.  The lease avoids
    // two application instances provisioning the same schema at once; an operator
    // can still force an immediate retry through the explicit retry endpoint.
    private static final java.time.Duration LEASE_DURATION = java.time.Duration.ofMinutes(30);

    private final TenantProvisioningJobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final SchemaProvisioningService schemaProvisioningService;
    private final EmailService emailService;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private TenantProvisioningService self;

    /** Enqueues a new tenant atomically with its public company record. */
    @Transactional
    public TenantProvisioningJob enqueue(Long companyId, Long initialAdminUserId) {
        Company company = companyRepository.findByIdPublic(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        return jobRepository.findByCompanyId(companyId).orElseGet(() -> {
            TenantProvisioningJob job = new TenantProvisioningJob();
            job.setCompany(company);
            job.setInitialAdminUserId(initialAdminUserId);
            job.setStatus(TenantProvisioningJob.Status.PENDING);
            job.setNextAttemptAt(LocalDateTime.now());
            return jobRepository.save(job);
        });
    }

    /**
     * Gives operations a concrete, persisted answer instead of requiring them to
     * infer workspace health from a company row or an HTTP timeout.
     */
    @Transactional(readOnly = true)
    public TenantProvisioningStatusResponse getStatus(Long companyId) {
        TenantProvisioningJob job = jobRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant provisioning job for company", companyId));
        return new TenantProvisioningStatusResponse(
                companyId, job.getStatus(), job.getAttempts(), job.getLastError(),
                job.getNextAttemptAt(), job.getCompletedAt());
    }

    /** Allows an operator to retry immediately after correcting a reported cause. */
    @Transactional
    public TenantProvisioningStatusResponse retryNow(Long companyId) {
        TenantProvisioningJob job = jobRepository.findByCompanyIdForUpdate(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant provisioning job for company", companyId));
        if (job.getStatus() != TenantProvisioningJob.Status.READY) {
            job.setStatus(TenantProvisioningJob.Status.PENDING);
            job.setLeaseExpiresAt(null);
            job.setNextAttemptAt(LocalDateTime.now());
            job.setLastError(null);
            jobRepository.save(job);
        }
        return new TenantProvisioningStatusResponse(
                companyId, job.getStatus(), job.getAttempts(), job.getLastError(),
                job.getNextAttemptAt(), job.getCompletedAt());
    }

    @Scheduled(initialDelayString = "${tenant.provisioning.initial-delay-ms:5000}",
            fixedDelayString = "${tenant.provisioning.poll-delay-ms:5000}")
    public void processPendingJobs() {
        List<TenantProvisioningJob> jobs = jobRepository.findByStatusIn(
                List.of(TenantProvisioningJob.Status.PENDING, TenantProvisioningJob.Status.FAILED,
                        TenantProvisioningJob.Status.RUNNING));
        for (TenantProvisioningJob job : jobs) {
            if (self.claim(job.getId())) {
                process(job.getId());
            }
        }
    }

    /**
     * Claims a job with a database row lock. Multiple instances can poll safely;
     * only the instance that changes the state to RUNNING performs the DDL.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claim(Long jobId) {
        TenantProvisioningJob job = jobRepository.findByIdForUpdate(jobId).orElse(null);
        if (job == null || job.getStatus() == TenantProvisioningJob.Status.READY) return false;

        LocalDateTime now = LocalDateTime.now();
        boolean due = job.getStatus() == TenantProvisioningJob.Status.PENDING
                || (job.getStatus() == TenantProvisioningJob.Status.FAILED
                    && (job.getNextAttemptAt() == null || !job.getNextAttemptAt().isAfter(now)))
                || (job.getStatus() == TenantProvisioningJob.Status.RUNNING
                    && (job.getLeaseExpiresAt() == null || !job.getLeaseExpiresAt().isAfter(now)));
        if (!due) return false;

        job.setStatus(TenantProvisioningJob.Status.RUNNING);
        job.setAttempts(job.getAttempts() + 1);
        job.setLeaseExpiresAt(now.plus(LEASE_DURATION));
        job.setLastError(null);
        jobRepository.save(job);
        return true;
    }

    /** Executes DDL without an open application transaction. */
    private void process(Long jobId) {
        TenantProvisioningJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        try {
            Company company = companyRepository.findByIdPublic(job.getCompany().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", job.getCompany().getId()));
            if (company.getSchemaName() == null || company.getSchemaName().isBlank()) {
                throw new IllegalStateException("Tenant schema name is missing");
            }

            schemaProvisioningService.provisionSchema(company.getSchemaName());
            self.createInitialAdminEmployee(jobId, company.getSchemaName());
            self.complete(jobId);
            notifyAccountReady(jobId, company.getSchemaName());
            log.info("[TenantProvisioning] Company {} is ready", company.getId());
        } catch (Exception e) {
            self.fail(jobId, e);
        }
    }

    private void notifyAccountReady(Long jobId, String schemaName) {
        try {
            TenantContext.setTenant(schemaName);
            TenantProvisioningJob job = jobRepository.findById(jobId).orElse(null);
            if (job == null || job.getInitialAdminUserId() == null) return;
            Company company = companyRepository.findByIdPublic(job.getCompany().getId()).orElse(null);
            User user = userRepository.findById(job.getInitialAdminUserId()).orElse(null);
            if (company == null || user == null || user.getEmail() == null || user.getEmail().isBlank()) return;
            emailService.ensureOnboardingTemplates(company);
            emailService.sendFromTemplate(company.getId(), EmailService.ACCOUNT_READY_TEMPLATE, user.getEmail(),
                    java.util.Map.of("recipientName", user.getFirstName() == null ? "there" : user.getFirstName(),
                            "companyName", company.getName(), "username", user.getUsername(),
                            "loginUrl", "https://grecha.ai/login", "passwordResetUrl", "https://grecha.ai/forgot-password"), null);
        } catch (Exception e) {
            log.warn("[TenantProvisioning] Account-ready email could not be sent for job {}: {}", jobId, e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }

    /** Runs with TenantContext set before the transaction obtains its connection. */
    public void createInitialAdminEmployee(Long jobId, String schemaName) {
        TenantContext.setTenant(schemaName);
        try {
            self.createInitialAdminEmployeeInTenant(jobId);
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createInitialAdminEmployeeInTenant(Long jobId) {
        TenantProvisioningJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant provisioning job", jobId));
        if (job.getInitialAdminUserId() == null
                || employeeRepository.findByUserId(job.getInitialAdminUserId()).isPresent()) {
            return;
        }
        User user = userRepository.findById(job.getInitialAdminUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", job.getInitialAdminUserId()));
        Company company = companyRepository.findByIdPublic(job.getCompany().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", job.getCompany().getId()));
        Employee employee = new Employee();
        employee.setFirstName(user.getFirstName() == null || user.getFirstName().isBlank() ? user.getUsername() : user.getFirstName());
        employee.setLastName(user.getLastName());
        employee.setEmail(user.getEmail());
        employee.setWorkEmail(user.getEmail());
        employee.setCompany(company);
        employee.setUser(user);
        employee.setDateJoining(LocalDate.now());
        employeeRepository.save(employee);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(Long jobId) {
        TenantProvisioningJob job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant provisioning job", jobId));
        Company company = companyRepository.findByIdPublic(job.getCompany().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", job.getCompany().getId()));
        company.setSchemaReady(true);
        companyRepository.save(company);
        job.setStatus(TenantProvisioningJob.Status.READY);
        job.setCompletedAt(LocalDateTime.now());
        job.setLeaseExpiresAt(null);
        job.setNextAttemptAt(null);
        job.setLastError(null);
        jobRepository.save(job);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(Long jobId, Exception error) {
        TenantProvisioningJob job = jobRepository.findByIdForUpdate(jobId).orElse(null);
        if (job == null || job.getStatus() == TenantProvisioningJob.Status.READY) return;
        String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        job.setStatus(TenantProvisioningJob.Status.FAILED);
        job.setLastError(message.length() > MAX_ERROR_LENGTH ? message.substring(0, MAX_ERROR_LENGTH) : message);
        job.setLeaseExpiresAt(null);
        // Back off slightly but retry automatically; provisioning is idempotent.
        job.setNextAttemptAt(LocalDateTime.now().plusSeconds(Math.min(300, 5L * job.getAttempts())));
        jobRepository.save(job);
        log.error("[TenantProvisioning] Company {} attempt {} failed: {}",
                job.getCompany().getId(), job.getAttempts(), message, error);
    }
}
