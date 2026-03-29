package com.example.demo.views.entity;

import com.example.demo.auth.entity.User;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "active_groups")
@Getter
@Setter
public class ActiveGroup extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "path", length = 256)
    private String path;

    @Column(name = "group_target", length = 256)
    private String groupTarget;

    @Column(name = "group_by_field", length = 256)
    private String groupByField;
}
