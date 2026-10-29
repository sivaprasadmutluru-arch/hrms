package com.example.demo.onboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "probation_confirmations", uniqueConstraints = @UniqueConstraint(columnNames = "employee_id"))
@Getter @Setter
public class ProbationConfirmation extends BaseEntity {
    @Column(name = "employee_id", nullable = false) private Long employeeId;
    @Column(name = "company_id", nullable = false) private Long companyId;
    @Column(name = "confirmed_on", nullable = false) private LocalDate confirmedOn;
    @Column(name = "processed_on", nullable = false) private LocalDate processedOn;
}
