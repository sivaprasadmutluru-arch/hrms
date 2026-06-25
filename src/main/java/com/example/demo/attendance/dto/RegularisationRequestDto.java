package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
public class RegularisationRequestDto {

    private Long id;
    private Long attendanceId;
    private LocalDate attendanceDate;
    private Long employeeId;
    private String employeeName;
    private String employeeBadgeId;
    private Long companyId;

    private String requestType;
    private String status;
    private String reason;
    private String attachmentUrl;

    private LocalTime requestedCheckIn;
    private LocalTime requestedCheckOut;
    private Double requestedOvertimeHours;

    // Manager
    private Long managerId;
    private String managerName;
    private Long managerApprovedById;
    private String managerApprovedByName;
    private LocalDateTime managerApprovedAt;
    private String managerRemarks;

    // HR
    private Long hrApprovedById;
    private String hrApprovedByName;
    private LocalDateTime hrApprovedAt;
    private String hrRemarks;

    // Rejection
    private Long rejectedById;
    private String rejectedByName;
    private LocalDateTime rejectedAt;
    private String rejectionRemarks;
    private String rejectionStage;

    private LocalDateTime createdAt;

    public static RegularisationRequestDto from(AttendanceRegularisationRequest r) {
        RegularisationRequestDto dto = new RegularisationRequestDto();
        dto.setId(r.getId());
        dto.setCompanyId(r.getCompany() != null ? r.getCompany().getId() : null);
        dto.setRequestType(r.getRequestType() != null ? r.getRequestType().name() : null);
        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        dto.setReason(r.getReason());
        dto.setAttachmentUrl(r.getAttachmentUrl());
        dto.setRequestedCheckIn(r.getRequestedCheckIn());
        dto.setRequestedCheckOut(r.getRequestedCheckOut());
        dto.setRequestedOvertimeHours(r.getRequestedOvertimeHours());
        dto.setManagerRemarks(r.getManagerRemarks());
        dto.setManagerApprovedAt(r.getManagerApprovedAt());
        dto.setHrRemarks(r.getHrRemarks());
        dto.setHrApprovedAt(r.getHrApprovedAt());
        dto.setRejectionRemarks(r.getRejectionRemarks());
        dto.setRejectedAt(r.getRejectedAt());
        dto.setRejectionStage(r.getRejectionStage() != null ? r.getRejectionStage().name() : null);
        dto.setCreatedAt(r.getCreatedAt());

        if (r.getAttendance() != null) {
            dto.setAttendanceId(r.getAttendance().getId());
            dto.setAttendanceDate(r.getAttendance().getAttendanceDate());
        }
        if (r.getEmployee() != null) {
            dto.setEmployeeId(r.getEmployee().getId());
            dto.setEmployeeName(r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName());
            dto.setEmployeeBadgeId(r.getEmployee().getBadgeId());
        }
        if (r.getManager() != null) {
            dto.setManagerId(r.getManager().getId());
            dto.setManagerName(r.getManager().getFirstName() + " " + r.getManager().getLastName());
        }
        if (r.getManagerApprovedBy() != null) {
            dto.setManagerApprovedById(r.getManagerApprovedBy().getId());
            dto.setManagerApprovedByName(r.getManagerApprovedBy().getFirstName() + " " + r.getManagerApprovedBy().getLastName());
        }
        if (r.getHrApprovedBy() != null) {
            dto.setHrApprovedById(r.getHrApprovedBy().getId());
            dto.setHrApprovedByName(r.getHrApprovedBy().getFirstName() + " " + r.getHrApprovedBy().getLastName());
        }
        if (r.getRejectedBy() != null) {
            dto.setRejectedById(r.getRejectedBy().getId());
            dto.setRejectedByName(r.getRejectedBy().getFirstName() + " " + r.getRejectedBy().getLastName());
        }
        return dto;
    }
}
