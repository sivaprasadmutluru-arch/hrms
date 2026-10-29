package com.example.demo.report.service;

import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsolidatedReportService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayslipRepository payslipRepository;
    private final com.example.demo.attendance.service.EmployeeAttendancePolicyService attendancePolicies;

    /**
     * Headcount summary — matches frontend expected shape:
     * { total, active, onLeave, departed, byDepartment: [{name, count}] }
     */
    public Map<String, Object> headcountSummary() {
        Specification<com.example.demo.employee.entity.Employee> spec = ScopeFilter.byCompany();
        List<com.example.demo.employee.entity.Employee> all = spec != null
                ? employeeRepository.findAll(spec)
                : employeeRepository.findAll();

        long total = all.size();
        long active = all.stream().filter(com.example.demo.employee.entity.Employee::isActive).count();
        long departed = total - active;

        // Count employees who have an APPROVED leave request overlapping today
        LocalDate today = LocalDate.now();
        Specification<LeaveRequest> leaveSpec = ScopeFilter.byCompany();
        List<LeaveRequest> leaveRequests = leaveSpec != null
                ? leaveRequestRepository.findAll(leaveSpec)
                : leaveRequestRepository.findAll();
        long onLeave = leaveRequests.stream()
                .filter(r -> LeaveRequest.LeaveStatus.APPROVED.equals(r.getStatus()))
                .filter(r -> r.getStartDate() != null && r.getEndDate() != null
                        && !r.getStartDate().isAfter(today) && !r.getEndDate().isBefore(today))
                .map(r -> r.getEmployee() != null ? r.getEmployee().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        // By department
        Map<String, Long> deptCounts = all.stream()
                .filter(com.example.demo.employee.entity.Employee::isActive)
                .collect(Collectors.groupingBy(
                        e -> e.getDepartment() != null ? e.getDepartment().getName() : "Unassigned",
                        Collectors.counting()
                ));
        List<Map<String, Object>> byDepartment = deptCounts.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> d = new HashMap<>();
                    d.put("name", entry.getKey());
                    d.put("count", entry.getValue());
                    return d;
                })
                .sorted(Comparator.comparing(m -> (String) m.get("name")))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("active", active);
        result.put("inactive", departed);
        result.put("onLeave", onLeave);
        result.put("departed", departed);
        result.put("byDepartment", byDepartment);
        result.put("departmentBreakdown", byDepartment);
        return result;
    }

    /**
     * Attendance summary — matches frontend expected shape:
     * { daily: [{date, present, absent}], totalRecords, approved, pending }
     */
    public Map<String, Object> attendanceSummary(LocalDate from, LocalDate to) {
        Specification<com.example.demo.attendance.entity.Attendance> spec = ScopeFilter.byCompany();
        List<com.example.demo.attendance.entity.Attendance> records = spec != null
                ? attendanceRepository.findAll(spec)
                : attendanceRepository.findAll();

        List<com.example.demo.attendance.entity.Attendance> filtered = records.stream()
                .filter(a -> {
                    LocalDate d = a.getAttendanceDate();
                    return d != null && (d.isEqual(from) || d.isAfter(from)) && (d.isEqual(to) || d.isBefore(to));
                })
                .toList();

        var staff = filtered.stream().map(com.example.demo.attendance.entity.Attendance::getEmployee)
                .filter(Objects::nonNull).filter(employee -> employee.getCompany() != null)
                .collect(Collectors.toMap(employee -> employee.getCompany().getId() + ":" + employee.getId(), employee -> employee, (a,b) -> a)).values();
        var policy = attendancePolicies.indexByCompany(staff, to);
        filtered = filtered.stream().filter(record -> record.getEmployee() != null && record.getEmployee().getCompany() != null
                && policy.get(record.getEmployee().getCompany().getId()).required(record.getEmployee().getId(), record.getAttendanceDate())).toList();
        long approved = filtered.stream()
                .filter(a -> com.example.demo.attendance.entity.Attendance.AttendanceQualityStatus.REGULAR == a.getAttendanceStatus()
                          || com.example.demo.attendance.entity.Attendance.AttendanceQualityStatus.REGULARISED == a.getAttendanceStatus())
                .count();
        long pending = filtered.stream()
                .filter(a -> com.example.demo.attendance.entity.Attendance.AttendanceQualityStatus.IRREGULAR == a.getAttendanceStatus())
                .count();

        // Build daily presence/absence chart data
        // Count any attendance record (regardless of approval status) as present
        Map<LocalDate, Long> presentByDay = filtered.stream()
                .filter(a -> a.getEmployee() != null)
                .collect(Collectors.groupingBy(
                        com.example.demo.attendance.entity.Attendance::getAttendanceDate,
                        Collectors.collectingAndThen(
                                Collectors.mapping(a -> a.getEmployee().getId(), Collectors.toSet()),
                                s -> (long) s.size()
                        )
                ));

        // Total distinct employees for context
        long totalEmployees = filtered.stream()
                .map(a -> a.getEmployee() != null ? a.getEmployee().getId() : null)
                .filter(Objects::nonNull).distinct().count();

        List<Map<String, Object>> daily = from.datesUntil(to.plusDays(1))
                .map(date -> {
                    Map<String, Object> day = new HashMap<>();
                    long present = presentByDay.getOrDefault(date, 0L);
                    day.put("date", date.toString());
                    day.put("present", present);
                    long requiredStaff = staff.stream().filter(employee -> policy.get(employee.getCompany().getId()).required(employee.getId(), date)).count();
                    day.put("absent", Math.max(0, requiredStaff - present));
                    return day;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("daily", daily);
        result.put("totalRecords", filtered.size());
        result.put("approved", approved);
        result.put("pending", pending);
        result.put("dateFrom", from);
        result.put("dateTo", to);
        return result;
    }

    /**
     * Leave summary — matches frontend expected shape:
     * { byType: [{type, count}], byStatus: [{status, count}], total, approved, requested, rejected }
     */
    public Map<String, Object> leaveSummary(LocalDate from, LocalDate to) {
        Specification<LeaveRequest> spec = ScopeFilter.byCompany();
        List<LeaveRequest> requests = spec != null
                ? leaveRequestRepository.findAll(spec)
                : leaveRequestRepository.findAll();

        List<LeaveRequest> filtered = requests.stream()
                .filter(r -> {
                    LocalDate start = r.getStartDate();
                    LocalDate end = r.getEndDate();
                    return start != null && end != null
                            && !start.isBefore(from)
                            && !end.isAfter(to);
                })
                .toList();

        long requested = filtered.stream()
                .filter(r -> LeaveRequest.LeaveStatus.REQUESTED.equals(r.getStatus())).count();
        long approved = filtered.stream()
                .filter(r -> LeaveRequest.LeaveStatus.APPROVED.equals(r.getStatus())).count();
        long rejected = filtered.stream()
                .filter(r -> LeaveRequest.LeaveStatus.REJECTED.equals(r.getStatus())).count();

        // By leave type
        Map<String, Long> typeCounts = filtered.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getLeaveType() != null ? r.getLeaveType().getName() : "Unknown",
                        Collectors.counting()
                ));
        List<Map<String, Object>> byType = typeCounts.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("type", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).collect(Collectors.toList());

        // By status
        List<Map<String, Object>> byStatus = Arrays.asList(
                Map.of("status", "REQUESTED", "count", requested),
                Map.of("status", "APPROVED", "count", approved),
                Map.of("status", "REJECTED", "count", rejected)
        );

        Map<String, Object> result = new HashMap<>();
        result.put("byType", byType);
        result.put("byStatus", byStatus);
        result.put("total", filtered.size());
        result.put("requested", requested);
        result.put("approved", approved);
        result.put("rejected", rejected);
        result.put("dateFrom", from);
        result.put("dateTo", to);
        return result;
    }

    /**
     * Payroll summary — matches frontend expected shape:
     * { monthly: [{month, total}], totalPayslips, processedPayslips, totalGrossPay, totalNetPay }
     */
    public Map<String, Object> payrollSummary(LocalDate from, LocalDate to) {
        Specification<Payslip> spec = ScopeFilter.byCompany();
        List<Payslip> payslips = spec != null
                ? payslipRepository.findAll(spec)
                : payslipRepository.findAll();

        List<Payslip> filtered = payslips.stream()
                .filter(p -> {
                    LocalDate period = p.getStartDate();
                    if (period == null) return true;
                    return !period.isBefore(from) && !period.isAfter(to);
                })
                .toList();

        double totalGross = filtered.stream()
                .mapToDouble(p -> p.getGrossPay() != null ? p.getGrossPay().doubleValue() : 0)
                .sum();
        double totalNet = filtered.stream()
                .mapToDouble(p -> p.getNetPay() != null ? p.getNetPay().doubleValue() : 0)
                .sum();
        long processed = filtered.stream()
                .filter(p -> Payslip.PayslipStatus.PAID.equals(p.getStatus())).count();

        // Monthly breakdown for bar chart
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM yyyy");
        Map<String, Double> monthlyTotals = new TreeMap<>(filtered.stream()
                .filter(p -> p.getStartDate() != null && p.getNetPay() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getStartDate().format(monthFormatter),
                        Collectors.summingDouble(p -> p.getNetPay().doubleValue())
                )));

        List<Map<String, Object>> monthly = monthlyTotals.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("month", e.getKey());
                    m.put("total", e.getValue());
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("monthly", monthly);
        result.put("totalPayslips", filtered.size());
        result.put("processedPayslips", processed);
        result.put("totalGrossPay", totalGross);
        result.put("totalNetPay", totalNet);
        result.put("dateFrom", from);
        result.put("dateTo", to);
        return result;
    }

    /**
     * Pending approvals summary across all companies accessible to the current user.
     * ENTERPRISE_ADMIN → all branches. BRANCH_ADMIN → their branch only.
     *
     * Returns counts of: pending leave requests, pending attendance records, draft payslips.
     */
    public Map<String, Object> pendingApprovalsSummary() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        List<Long> companyIds = (scope != null && !scope.hasUnrestrictedAccess())
                ? scope.getAccessibleCompanyIds() : null;

        // Pending leave requests
        Specification<LeaveRequest> leaveSpec = ScopeFilter.byCompany();
        List<LeaveRequest> allLeave = leaveSpec != null
                ? leaveRequestRepository.findAll(leaveSpec)
                : leaveRequestRepository.findAll();
        long pendingLeave = allLeave.stream()
                .filter(r -> LeaveRequest.LeaveStatus.REQUESTED.equals(r.getStatus()))
                .count();

        // Pending attendance records
        Specification<com.example.demo.attendance.entity.Attendance> attSpec = ScopeFilter.byCompany();
        List<com.example.demo.attendance.entity.Attendance> allAtt = attSpec != null
                ? attendanceRepository.findAll(attSpec)
                : attendanceRepository.findAll();
        long pendingAttendance = allAtt.stream()
                .filter(a -> com.example.demo.attendance.entity.Attendance.AttendanceQualityStatus.IRREGULAR
                        == a.getAttendanceStatus())
                .count();

        // Draft payslips
        Specification<Payslip> paySpec = ScopeFilter.byCompany();
        List<Payslip> allPayslips = paySpec != null
                ? payslipRepository.findAll(paySpec)
                : payslipRepository.findAll();
        long draftPayslips = allPayslips.stream()
                .filter(p -> Payslip.PayslipStatus.DRAFT.equals(p.getStatus()))
                .count();

        Map<String, Object> result = new HashMap<>();
        result.put("pendingLeaveRequests", pendingLeave);
        result.put("pendingAttendanceApprovals", pendingAttendance);
        result.put("draftPayslips", draftPayslips);
        result.put("totalPendingActions", pendingLeave + pendingAttendance + draftPayslips);
        if (scope != null) {
            result.put("accessibleCompanies", scope.getAccessibleCompanyIds());
        }
        return result;
    }

    /**
     * Returns raw data list for Excel export.
     */
    public List<Map<String, Object>> getExportData(String reportType, LocalDate from, LocalDate to) {
        return switch (reportType.toLowerCase()) {
            case "attendance" -> buildAttendanceExportData(from, to);
            case "leave" -> buildLeaveExportData(from, to);
            case "payroll" -> buildPayrollExportData(from, to);
            default -> throw new com.example.demo.common.exception.BadRequestException(
                    "Unknown report type: " + reportType + ". Valid values: attendance, leave, payroll");
        };
    }

    private List<Map<String, Object>> buildAttendanceExportData(LocalDate from, LocalDate to) {
        Specification<com.example.demo.attendance.entity.Attendance> spec = ScopeFilter.byCompany();
        List<com.example.demo.attendance.entity.Attendance> records = spec != null
                ? attendanceRepository.findAll(spec)
                : attendanceRepository.findAll();

        return records.stream()
                .filter(a -> {
                    LocalDate d = a.getAttendanceDate();
                    return (d.isEqual(from) || d.isAfter(from)) && (d.isEqual(to) || d.isBefore(to));
                })
                .map(a -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("Date", a.getAttendanceDate());
                    row.put("Employee ID", a.getEmployee() != null ? a.getEmployee().getId() : "");
                    row.put("Employee Name", a.getEmployee() != null
                            ? a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName() : "");
                    row.put("Check In", a.getCheckIn());
                    row.put("Check Out", a.getCheckOut());
                    row.put("Status", a.getAttendanceStatus() != null ? a.getAttendanceStatus().name() : "REGULAR");
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> buildLeaveExportData(LocalDate from, LocalDate to) {
        Specification<LeaveRequest> spec = ScopeFilter.byCompany();
        List<LeaveRequest> requests = spec != null
                ? leaveRequestRepository.findAll(spec)
                : leaveRequestRepository.findAll();

        return requests.stream()
                .filter(r -> {
                    LocalDate start = r.getStartDate();
                    LocalDate end = r.getEndDate();
                    return start != null && end != null && !start.isBefore(from) && !end.isAfter(to);
                })
                .map(r -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("Employee ID", r.getEmployee() != null ? r.getEmployee().getId() : "");
                    row.put("Employee Name", r.getEmployee() != null
                            ? r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName() : "");
                    row.put("Leave Type", r.getLeaveType() != null ? r.getLeaveType().getName() : "");
                    row.put("Start Date", r.getStartDate());
                    row.put("End Date", r.getEndDate());
                    row.put("Status", r.getStatus());
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> buildPayrollExportData(LocalDate from, LocalDate to) {
        Specification<Payslip> spec = ScopeFilter.byCompany();
        List<Payslip> payslips = spec != null
                ? payslipRepository.findAll(spec)
                : payslipRepository.findAll();

        return payslips.stream()
                .filter(p -> {
                    LocalDate period = p.getStartDate();
                    if (period == null) return true;
                    return !period.isBefore(from) && !period.isAfter(to);
                })
                .map(p -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("Employee ID", p.getEmployee() != null ? p.getEmployee().getId() : "");
                    row.put("Employee Name", p.getEmployee() != null
                            ? p.getEmployee().getFirstName() + " " + p.getEmployee().getLastName() : "");
                    row.put("Pay Period Start", p.getStartDate());
                    row.put("Pay Period End", p.getEndDate());
                    row.put("Gross Pay", p.getGrossPay());
                    row.put("Net Pay", p.getNetPay());
                    row.put("Status", p.getStatus());
                    return row;
                })
                .toList();
    }
}
