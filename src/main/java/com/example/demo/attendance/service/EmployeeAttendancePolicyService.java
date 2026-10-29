package com.example.demo.attendance.service;

import com.example.demo.attendance.entity.EmployeeAttendancePolicy;
import com.example.demo.attendance.repository.EmployeeAttendancePolicyRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.auth.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class EmployeeAttendancePolicyService {
    private final EmployeeAttendancePolicyRepository policies;
    private final EmployeeRepository employees;
    public static LocalDate today() {return LocalDate.now(ZoneId.of("Asia/Dubai"));}

    public record PolicyView(boolean attendanceRequired, List<EmployeeAttendancePolicy> history) {}
    public record Change(Boolean attendanceRequired, LocalDate effectiveFrom, String reason) {}

    /** One query per company/range, not per employee/day. Default is always required. */
    public PolicyIndex index(Long companyId, List<Long> employeeIds, LocalDate end) {
        if (employeeIds.isEmpty()) return new PolicyIndex(List.of());
        return new PolicyIndex(policies.findByCompanyIdAndEmployeeIdInAndEffectiveFromLessThanEqualOrderByEffectiveFromDescIdDesc(companyId, employeeIds, end));
    }
    public boolean required(Employee employee, LocalDate date) {
        return index(employee.getCompany().getId(), List.of(employee.getId()), date).required(employee.getId(), date);
    }
    public Map<Long, PolicyIndex> indexByCompany(Collection<Employee> staff, LocalDate end) {
        Map<Long, List<Long>> ids = new HashMap<>();
        staff.stream().filter(employee -> employee != null && employee.getCompany() != null)
                .forEach(employee -> ids.computeIfAbsent(employee.getCompany().getId(), ignored -> new ArrayList<>()).add(employee.getId()));
        Map<Long, PolicyIndex> result = new HashMap<>();
        ids.forEach((company, employees) -> result.put(company, index(company, employees.stream().distinct().toList(), end)));
        return result;
    }
    public static class PolicyIndex {
        private final Map<Long, List<EmployeeAttendancePolicy>> byEmployee = new HashMap<>();
        public PolicyIndex(List<EmployeeAttendancePolicy> entries) {
            entries.stream().sorted(Comparator.comparing(EmployeeAttendancePolicy::getEffectiveFrom).reversed()
                    .thenComparing(EmployeeAttendancePolicy::getId, Comparator.reverseOrder()))
                    .forEach(entry -> byEmployee.computeIfAbsent(entry.getEmployeeId(), ignored -> new ArrayList<>()).add(entry));
        }
        public boolean required(Long employeeId, LocalDate date) {
            return byEmployee.getOrDefault(employeeId, List.of()).stream()
                    .filter(entry -> !entry.getEffectiveFrom().isAfter(date)).findFirst()
                    .map(EmployeeAttendancePolicy::isAttendanceRequired).orElse(true);
        }
    }
    private Employee visibleEmployee(Long id, boolean edit) {
        Employee employee = employees.findById(id).orElseThrow(() -> new ResourceNotFoundException("Employee", id));
        var scope = AccessScopeContext.get();
        if (scope == null || employee.getCompany() == null || !scope.canAccess(employee.getCompany().getId())
                || (scope.getFilterCompanyId() != null && !scope.getFilterCompanyId().equals(employee.getCompany().getId())))
            throw new AccessDeniedException("Employee is outside the selected company scope");
        if (scope.isSelfScope() && (edit || employee.getUser() == null || !scope.getUserId().equals(employee.getUser().getId())))
            throw new AccessDeniedException("You cannot change your own attendance policy");
        if (scope.getScope() == UserRole.AccessScope.DEPARTMENT && (employee.getDepartment() == null
                || !Objects.equals(scope.getDepartmentId(), employee.getDepartment().getId())))
            throw new AccessDeniedException("Employee is outside your department");
        return employee;
    }
    public PolicyView view(Long id) {
        Employee employee = visibleEmployee(id, false);
        return new PolicyView(required(employee, today()), policies.findByCompanyIdAndEmployeeIdOrderByEffectiveFromDescIdDesc(employee.getCompany().getId(), id));
    }
    @Transactional
    public PolicyView change(Long id, Change change, Long actor) {
        Employee employee = visibleEmployee(id, true);
        if (change == null || change.attendanceRequired() == null || change.effectiveFrom() == null)
            throw new BadRequestException("Attendance requirement and effective date are required");
        if (change.effectiveFrom().isBefore(today()))
            throw new BadRequestException("Use today or a future effective date; historical attendance cannot be changed here");
        if (change.reason() == null || change.reason().isBlank() || change.reason().trim().length() > 500)
            throw new BadRequestException("Enter an attendance policy change reason (up to 500 characters)");
        if (actor == null || !actor.equals(AccessScopeContext.get().getUserId())) throw new AccessDeniedException("Invalid policy author");
        EmployeeAttendancePolicy entry = new EmployeeAttendancePolicy();
        entry.setEmployeeId(id); entry.setCompanyId(employee.getCompany().getId());
        entry.setAttendanceRequired(change.attendanceRequired()); entry.setEffectiveFrom(change.effectiveFrom());
        entry.setReason(change.reason().trim()); entry.setChangedByUserId(actor);
        policies.saveAndFlush(entry);
        return view(id);
    }
}
