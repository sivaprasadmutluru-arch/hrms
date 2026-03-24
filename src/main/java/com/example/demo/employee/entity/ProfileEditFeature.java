package com.example.demo.employee.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Controls which profile fields an employee can self-edit.
 * One record per feature per company.
 */
@Entity
@Table(name = "employee_profile_edit_features",
        uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "feature_name"}))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class ProfileEditFeature extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /**
     * Name of the profile field/feature (e.g., "phone", "address", "profile_image",
     * "bank_details", "emergency_contact")
     */
    @Column(name = "feature_name", nullable = false)
    private String featureName;

    /** Whether employees are allowed to edit this field themselves */
    @Column(name = "is_editable")
    private Boolean isEditable = false;
}
