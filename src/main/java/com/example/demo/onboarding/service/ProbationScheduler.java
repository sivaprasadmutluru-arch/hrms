package com.example.demo.onboarding.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.onboarding.repository.ProbationPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.ZoneId;

@Component @RequiredArgsConstructor @Slf4j
public class ProbationScheduler {
    private final CompanyRepository companies;
    private final EmployeeRepository employees;
    private final ProbationPolicyRepository policies;
    private final ProbationConfirmationService confirmations;
    private final com.example.demo.leave.service.LeaveAccrualService accruals;
    private volatile boolean ready;

    @EventListener(ApplicationReadyEvent.class)
    public void ready() { ready = true; process(); }

    @Scheduled(fixedDelayString = "${onboarding.probation.scan-ms:3600000}", initialDelayString = "${onboarding.probation.scan-ms:3600000}")
    public synchronized void process() {
        if (!ready) return;
        String previous = TenantContext.getTenant();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Dubai"));
        try {
            for (var tenant : companies.findAllHeadOfficesActivePublic()) {
                if (!tenant.isSchemaReady() || tenant.getSchemaName() == null) continue;
                try {
                    TenantContext.setTenant(tenant.getSchemaName());
                    for (var policy : policies.findByEnabledTrue()) {
                        for (var employee : employees.findByCompanyIdAndIsActiveTrue(policy.getCompanyId())) {
                            try {
                                if (confirmations.confirmIfDue(employee.getId(), today))
                                    log.info("Probation confirmed tenant={} employee={}", tenant.getSchemaName(), employee.getId());
                                accruals.processProbationAccrual(employee.getId(), today);
                            } catch (Exception ex) {
                                log.error("Probation confirmation failed tenant={} employee={}", tenant.getSchemaName(), employee.getId(), ex);
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.error("Probation scan failed tenant={}", tenant.getSchemaName(), ex);
                } finally { TenantContext.setTenant(previous); }
            }
        } finally { TenantContext.setTenant(previous); }
    }
}
