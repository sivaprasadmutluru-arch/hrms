package com.example.demo.attendance.dto;

import com.example.demo.base.entity.ShiftAllocationRequest;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.employee.entity.Employee;
import java.time.LocalDate;

/** Snapshot associations inside the transaction instead of serializing lazy entities. */
public record ShiftAllocationDTO(Long id, EmployeeSummary employee, ShiftSummary allocatedShift,
        ShiftSummary previousShift, LocalDate effectiveDate, String description,
        ShiftAllocationRequest.AllocationStatus status, EmployeeSummary allocatedBy, CompanySummary company) {
    public record EmployeeSummary(Long id, String firstName, String lastName) {}
    public record ShiftSummary(Long id, String name) {}
    public record CompanySummary(Long id) {}

    public static ShiftAllocationDTO from(ShiftAllocationRequest request) {
        return new ShiftAllocationDTO(request.getId(), employee(request.getEmployee()),
                shift(request.getAllocatedShift()), shift(request.getPreviousShift()),
                request.getEffectiveDate(), request.getDescription(), request.getStatus(),
                employee(request.getAllocatedBy()), request.getCompany() == null ? null
                        : new CompanySummary(request.getCompany().getId()));
    }

    private static EmployeeSummary employee(Employee employee) {
        return employee == null ? null : new EmployeeSummary(employee.getId(), employee.getFirstName(), employee.getLastName());
    }

    private static ShiftSummary shift(ShiftSchedule shift) {
        return shift == null ? null : new ShiftSummary(shift.getId(), shift.getName());
    }
}
