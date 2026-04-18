package com.example.demo.documents.dto;

import com.example.demo.documents.entity.EmployeeDocument.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class SubmissionStatusDTO {

    private Long employeeId;
    private String badgeId;
    private String employeeName;
    private String email;

    /** SUBMITTED, APPROVED, REJECTED, or PENDING (never submitted) */
    private DocumentStatus status;

    /** null when status is PENDING */
    private LocalDateTime submittedAt;

    /** null unless status is REJECTED */
    private String rejectReason;
}
