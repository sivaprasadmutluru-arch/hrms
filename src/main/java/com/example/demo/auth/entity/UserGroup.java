package com.example.demo.auth.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * A named permission group that can be assigned to multiple users.
 * Inspired by Django's Group model — each group holds a set of permissions
 * (as string codes, e.g. "employee:view", "payroll:edit") and users
 * inherit all permissions from their assigned groups.
 */
@Entity
@Table(name = "user_groups", schema = "public")
@Getter
@Setter
public class UserGroup extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    /**
     * Permission codes granted to this group.
     * Stored as a comma-separated string, e.g. "employee:view,employee:edit,payroll:view"
     */
    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_group_members",
        schema = "public",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> members = new HashSet<>();
}
