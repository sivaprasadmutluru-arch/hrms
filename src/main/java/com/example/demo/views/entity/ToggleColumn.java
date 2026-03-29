package com.example.demo.views.entity;

import com.example.demo.auth.entity.User;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "toggle_columns")
@Getter
@Setter
public class ToggleColumn extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "path", length = 256)
    private String path;

    @Column(name = "excluded_columns", columnDefinition = "TEXT")
    private String excludedColumns;
}
