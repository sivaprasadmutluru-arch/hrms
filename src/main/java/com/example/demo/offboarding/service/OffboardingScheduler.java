package com.example.demo.offboarding.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.offboarding.entity.EmployeeOffboarding;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * EMP-004: automatically deactivates employees whose offboarding exit date has arrived,
 * for future-dated offboardings that weren't already deactivated immediately at creation.
 * Runs daily, once per tenant schema (mirrors PayrollScheduler's per-schema loop).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OffboardingScheduler {

    private final CompanyRepository companyRepository;
    private final OffboardingService offboardingService;
    private final com.example.demo.offboarding.repository.EmployeeOffboardingRepository offboardingRepository;

    @Scheduled(cron = "0 5 0 * * *")
    public void activateDueOffboardings() {
        LocalDate today = LocalDate.now();
        List<Company> headOffices = companyRepository.findByCompanyType(Company.CompanyType.HEAD_OFFICE);
        log.info("[OffboardingScheduler] Tick — date={} | tenants={}", today, headOffices.size());

        for (Company headOffice : headOffices) {
            String schema = headOffice.getSchemaName();
            if (schema == null || schema.isBlank()) {
                continue;
            }
            try {
                TenantContext.setTenant(schema);
                List<Long> dueIds = offboardingRepository
                        .findByEmployeeDeactivatedAtIsNullAndExitDateLessThanEqual(today)
                        .stream().map(EmployeeOffboarding::getId).toList();
                for (Long id : dueIds) {
                    try {
                        EmployeeOffboarding activated = offboardingService.activateOffboardingById(id);
                        log.info("[OffboardingScheduler] Schema '{}' — activated offboarding id={} for employee id={}",
                                schema, id, activated.getEmployee() != null ? activated.getEmployee().getId() : null);
                    } catch (Exception e) {
                        log.warn("[OffboardingScheduler] Schema '{}' — failed to activate offboarding id={}: {}",
                                schema, id, e.getMessage());
                    }
                }
            } finally {
                TenantContext.clear();
            }
        }
    }
}
