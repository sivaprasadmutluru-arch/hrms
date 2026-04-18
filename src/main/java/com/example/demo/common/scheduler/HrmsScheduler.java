package com.example.demo.common.scheduler;

import com.example.demo.attendance.controller.RotatingScheduleController;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.RotatingShiftAssign;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.RotatingShiftAssignRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
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
    private final AttendanceService attendanceService;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final RotatingShiftAssignRepository rotatingShiftAssignRepository;

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
            if (!Boolean.TRUE.equals(config.getAutoGenerate())) continue;
            String generateDayStr = config.getGenerateDay();
            int targetDay;
            if ("last day".equalsIgnoreCase(generateDayStr)) {
                targetDay = today.lengthOfMonth();
            } else {
                try { targetDay = Integer.parseInt(generateDayStr != null ? generateDayStr : "1"); }
                catch (NumberFormatException ex) { targetDay = 1; }
            }
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
     * Monthly overtime computation: runs on the 1st of each month at 03:00.
     * For each company, computes overtime for all active employees for the previous month.
     */
    @Scheduled(cron = "0 0 3 1 * *")
    public void computeMonthlyOvertime() {
        LocalDate lastMonth = LocalDate.now().minusMonths(1);
        int month = lastMonth.getMonthValue();
        int year = lastMonth.getYear();

        List<Company> companies = companyRepository.findAll();
        for (Company company : companies) {
            List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(company.getId());
            for (Employee employee : employees) {
                boolean hasAttendance = !attendanceRepository
                        .findByEmployeeIdAndAttendanceDateBetween(
                                employee.getId(),
                                lastMonth.withDayOfMonth(1),
                                lastMonth.withDayOfMonth(lastMonth.lengthOfMonth()))
                        .isEmpty();
                if (!hasAttendance) continue;
                try {
                    attendanceService.computeMonthlyOvertime(employee.getId(), company.getId(), month, year);
                } catch (Exception e) {
                    log.error("Overtime computation failed for employee {} company {}: {}",
                            employee.getId(), company.getId(), e.getMessage());
                }
            }
        }
        log.info("Monthly overtime computed for {}/{}", month, year);
    }

    /**
     * Rotating shift rotation: runs daily at 00:30.
     * Finds all RotatingShiftAssign records whose nextChangeDate has arrived,
     * swaps currentShift ↔ nextShift, and advances nextChangeDate.
     */
    @Scheduled(cron = "0 30 0 * * *")
    public void rotateShifts() {
        LocalDate today = LocalDate.now();
        List<RotatingShiftAssign> due = rotatingShiftAssignRepository.findByNextChangeDateLessThanEqual(today);
        for (RotatingShiftAssign assign : due) {
            try {
                RotatingScheduleController.applyRotation(assign);
                rotatingShiftAssignRepository.save(assign);
                log.info("Rotated shift for employee {} → currentShift={}",
                        assign.getEmployee().getId(),
                        assign.getCurrentShift() != null ? assign.getCurrentShift().getName() : "null");
            } catch (Exception e) {
                log.error("Failed to rotate shift for assign {}: {}", assign.getId(), e.getMessage());
            }
        }
        if (!due.isEmpty()) {
            log.info("Rotating shift job completed: {} assignments rotated", due.size());
        }
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
