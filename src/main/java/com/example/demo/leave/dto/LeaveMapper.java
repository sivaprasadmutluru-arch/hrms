package com.example.demo.leave.dto;

import com.example.demo.leave.entity.*;

public final class LeaveMapper {

    private LeaveMapper() {}

    private static String employeeName(com.example.demo.employee.entity.Employee e) {
        if (e == null) return null;
        String name = ((e.getFirstName() != null ? e.getFirstName() : "") + " " +
                       (e.getLastName()  != null ? e.getLastName()  : "")).trim();
        return name.isEmpty() ? null : name;
    }

    public static LeaveRequestDTO toDTO(LeaveRequest r) {
        return toDTO(r, false);
    }

    public static LeaveRequestDTO toDTO(LeaveRequest r, boolean canReview) {
        String deptName = (r.getEmployee() != null && r.getEmployee().getDepartment() != null)
                ? r.getEmployee().getDepartment().getName() : null;
        Long companyId = r.getCompany() != null ? r.getCompany().getId() : null;
        String approvedByName = employeeName(r.getApprovedBy());
        return new LeaveRequestDTO(
                r.getId(),
                r.getEmployee() != null ? r.getEmployee().getId() : null,
                employeeName(r.getEmployee()),
                r.getLeaveType() != null ? r.getLeaveType().getId() : null,
                r.getLeaveType() != null ? r.getLeaveType().getName() : null,
                r.getStartDate(),
                r.getEndDate(),
                r.getRequestedDays(),
                r.getLeaveDuration() != null ? r.getLeaveDuration() : LeaveRequest.LeaveDuration.FULL_DAY,
                r.getStatus(),
                r.getDescription(),
                r.getRejectReason(),
                deptName,
                companyId,
                approvedByName,
                r.getCreatedAt(),
                canReview
        );
    }

    public static LeaveTypeDTO toDTO(LeaveType lt) {
        java.util.List<Long> empTypeIds = lt.getApplicableEmployeeTypes() == null ? java.util.List.of()
                : lt.getApplicableEmployeeTypes().stream().map(com.example.demo.common.entity.BaseEntity::getId).toList();
        java.util.List<String> empTypeNames = lt.getApplicableEmployeeTypes() == null ? java.util.List.of()
                : lt.getApplicableEmployeeTypes().stream().map(com.example.demo.base.entity.EmployeeType::getName).toList();
        return new LeaveTypeDTO(
                lt.getId(),
                lt.getName(),
                lt.getTotalDays(),
                lt.getPaymentType(),
                lt.getCarryforwardType(),
                lt.getCarryforwardMax(),
                lt.getCarryforwardExpireIn(),
                lt.getCarryforwardExpirePeriod(),
                lt.getCarryforwardExpireDate(),
                lt.getLeaveValidationType(),
                lt.getColorCode(),
                lt.getReset(),
                lt.getResetBased(),
                lt.getResetMonth(),
                lt.getResetDay(),
                lt.getResetWeekend(),
                lt.getAccrualEnabled(),
                lt.getMidYearJoinerMode(),
                lt.getNegativeBalanceAllowed(),
                lt.getNegativeBalanceLimit(),
                lt.getExcludeWeekend(),
                lt.isActive(),
                empTypeIds,
                empTypeNames
        );
    }

    public static AvailableLeaveDTO toDTO(AvailableLeave al) {
        return toDTO(al, 0.0);
    }

    public static AvailableLeaveDTO toDTO(AvailableLeave al, double usedDays) {
        return new AvailableLeaveDTO(
                al.getId(),
                al.getEmployee() != null ? al.getEmployee().getId() : null,
                employeeName(al.getEmployee()),
                al.getLeaveType() != null ? al.getLeaveType().getId() : null,
                al.getLeaveType() != null ? al.getLeaveType().getName() : null,
                al.getAvailableDays(),
                al.getCarryforwardDays(),
                al.creditedTotalDays(),
                usedDays,
                al.getAssignedDate(),
                al.getResetDate(),
                al.getExpiredDate()
        );
    }

    public static LeaveAllocationDTO toDTO(LeaveAllocation la) {
        return toDTO(la, 0.0);
    }

    public static LeaveAllocationDTO toDTO(LeaveAllocation la, double usedDays) {
        double allocated = (la.getAvailableDays() != null ? la.getAvailableDays() : 0.0)
                + (la.getCarryforwardDays() != null ? la.getCarryforwardDays() : 0.0);
        return new LeaveAllocationDTO(
                la.getId(),
                la.getEmployee() != null ? la.getEmployee().getId() : null,
                employeeName(la.getEmployee()),
                la.getLeaveType() != null ? la.getLeaveType().getId() : null,
                la.getLeaveType() != null ? la.getLeaveType().getName() : null,
                allocated,
                la.getAvailableDays(),
                la.getCarryforwardDays(),
                usedDays,
                allocated - usedDays,
                la.getYear(),
                la.getStatus()
        );
    }

    public static LeaveAllocationRequestDTO toDTO(LeaveAllocationRequest lar) {
        return new LeaveAllocationRequestDTO(
                lar.getId(),
                lar.getEmployee() != null ? lar.getEmployee().getId() : null,
                employeeName(lar.getEmployee()),
                lar.getLeaveType() != null ? lar.getLeaveType().getId() : null,
                lar.getLeaveType() != null ? lar.getLeaveType().getName() : null,
                lar.getRequestedDays(),
                lar.getRequestedDate(),
                lar.getStatus(),
                lar.getDescription(),
                lar.getRejectReason(),
                lar.getAllocationAction() != null ? lar.getAllocationAction().name() : "GRANT",
                lar.getSourceRequest() != null ? lar.getSourceRequest().getId() : null,
                lar.getLifecycleStatus() != null ? lar.getLifecycleStatus().name() : "ACTIVE",
                lar.getAppliedDays()
        );
    }

    public static CompensatoryLeaveRequestDTO toDTO(CompensatoryLeaveRequest clr) {
        return new CompensatoryLeaveRequestDTO(
                clr.getId(),
                clr.getEmployee() != null ? clr.getEmployee().getId() : null,
                employeeName(clr.getEmployee()),
                clr.getLeaveType() != null ? clr.getLeaveType().getId() : null,
                clr.getLeaveType() != null ? clr.getLeaveType().getName() : null,
                clr.getRequestedDays(),
                clr.getRequestedDate(),
                clr.getStatus(),
                clr.getDescription(),
                clr.getRejectReason()
        );
    }

    public static LeaveRestrictionDTO toDTO(RestrictLeave rl) {
        return new LeaveRestrictionDTO(
                rl.getId(),
                rl.getTitle(),
                rl.getStartDate(),
                rl.getEndDate(),
                rl.getDescription(),
                rl.getDepartment() != null ? rl.getDepartment().getId() : null,
                rl.getDepartment() != null ? rl.getDepartment().getName() : null
        );
    }
}
