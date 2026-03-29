package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "announcement_expire")
@Getter
@Setter
public class AnnouncementExpire extends BaseEntity {

    @Column(name = "days")
    private Integer days = 30;
}
