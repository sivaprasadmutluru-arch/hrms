package com.example.demo.views.entity;

import com.example.demo.auth.entity.User;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "saved_filters")
@Getter
@Setter
public class SavedFilter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "title", length = 20, nullable = true)
    private String title;

    @Column(name = "color", length = 10)
    private String color;

    @Column(name = "is_default")
    private boolean isDefault = false;

    @Column(name = "filter", columnDefinition = "TEXT")
    private String filter;

    @Column(name = "urlencode", columnDefinition = "TEXT")
    private String urlencode;

    @Column(name = "path", length = 256)
    private String path;

    @Column(name = "referrer", length = 256)
    private String referrer;
}
