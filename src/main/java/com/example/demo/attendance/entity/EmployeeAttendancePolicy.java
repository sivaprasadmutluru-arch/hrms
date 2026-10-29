package com.example.demo.attendance.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

/** Append-only, effective-dated policy; changing a job title never changes attendance. */
@Entity
@Table(name = "employee_attendance_policies", indexes = @Index(name = "employee_attendance_policy_lookup", columnList = "company_id,employee_id,effective_from DESC,id DESC"))
@Getter @Setter
public class EmployeeAttendancePolicy extends BaseEntity {
    @Column(name = "employee_id", nullable = false) private Long employeeId;
    @Column(name = "company_id", nullable = false) private Long companyId;
    @Column(name = "attendance_required", nullable = false) private boolean attendanceRequired = true;
    @Column(name = "effective_from", nullable = false) private LocalDate effectiveFrom;
    @Column(name = "reason", nullable = false, length = 500) private String reason;
    @Column(name = "changed_by_user_id", nullable = false) private Long changedByUserId;
}
