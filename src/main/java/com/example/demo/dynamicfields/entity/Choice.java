package com.example.demo.dynamicfields.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "dynamic_choices")
@Getter
@Setter
public class Choice extends BaseEntity {

    @Column(name = "title", length = 25, nullable = false)
    private String title;
}
