package com.example.demo.onboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "probation_policies", uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@Getter @Setter
public class ProbationPolicy extends BaseEntity {
    @Column(name = "company_id", nullable = false) private Long companyId;
    @Column(nullable = false) private boolean enabled;
    /** Apply only to employees joining on/after this date; never reset historical balances. */
    @Column(name = "effective_from", nullable = false) private LocalDate effectiveFrom;
}
