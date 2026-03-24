package com.example.demo.common.scheduler;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.payroll.entity.PayslipAutoGenerate;
import com.example.demo.payroll.repository.ContractRepository;
import com.example.demo.payroll.repository.PayslipAutoGenerateRepository;
import com.example.demo.payroll.service.PayrollService;
import com.example.demo.leave.service.LeaveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class HrmsScheduler {

    private final PayrollService payrollService;
    private final PayslipAutoGenerateRepository payslipAutoGenerateRepository;
    private final ContractRepository contractRepository;
    private final CompanyRepository companyRepository;
    private final LeaveService leaveService;

    /**
     * Payslip auto-generation: runs daily at 01:00.
     * For each company with auto-generate enabled, if today matches the configured generateDay,
     * bulk-generate payslips for the current month period.
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void autoGeneratePayslips() {
        LocalDate today = LocalDate.now();
        List<PayslipAutoGenerate> configs = payslipAutoGenerateRepository.findAll();
        for (PayslipAutoGenerate config : configs) {
            if (!Boolean.TRUE.equals(config.getIsEnabled())) continue;
            int targetDay = config.getGenerateDay() != null ? config.getGenerateDay() : 1;
            // Adjust for months with fewer days
            int lastDayOfMonth = today.lengthOfMonth();
            int effectiveDay = Math.min(targetDay, lastDayOfMonth);
            if (today.getDayOfMonth() != effectiveDay) continue;

            Long companyId = config.getCompany().getId();
            LocalDate startDate = today.withDayOfMonth(1);
            LocalDate endDate = today.withDayOfMonth(lastDayOfMonth);
            try {
                List<?> payslips = payrollService.generateBulkPayslips(companyId, startDate, endDate);
                log.info("Auto-generated {} payslips for company {} (period {}-{})",
                        payslips.size(), companyId, startDate, endDate);
            } catch (Exception e) {
                log.error("Failed to auto-generate payslips for company {}: {}", companyId, e.getMessage());
            }
        }
    }

    /**
     * Contract expiry alert: runs daily at 06:00.
     * Finds contracts expiring within 30 days and logs a warning.
     * (Actual email notifications can be wired through EmailService once employees have email stored.)
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void checkContractExpiry() {
        LocalDate today = LocalDate.now();
        LocalDate alertThreshold = today.plusDays(30);
        contractRepository.findAll().stream()
                .filter(c -> c.getContractStatus() == com.example.demo.payroll.entity.Contract.ContractStatus.ACTIVE)
                .filter(c -> c.getEndDate() != null
                        && !c.getEndDate().isBefore(today)
                        && !c.getEndDate().isAfter(alertThreshold))
                .forEach(c -> log.warn("Contract {} for employee {} expires on {}",
                        c.getId(), c.getEmployee().getId(), c.getEndDate()));
    }

    /**
     * Annual leave reset: runs on January 1st at 02:00 every year.
     * Triggers leave balance reset with carry-forward logic for all active companies.
     */
    @Scheduled(cron = "0 0 2 1 1 *")
    public void annualLeaveReset() {
        int lastYear = LocalDate.now().getYear() - 1;
        List<Company> companies = companyRepository.findAll();
        for (Company company : companies) {
            try {
                leaveService.annualReset(company.getId(), lastYear);
                log.info("Annual leave reset completed for company {} (year {})", company.getId(), lastYear);
            } catch (Exception e) {
                log.error("Annual leave reset failed for company {}: {}", company.getId(), e.getMessage());
            }
        }
    }
}
