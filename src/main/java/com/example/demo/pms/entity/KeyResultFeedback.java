package com.example.demo.pms.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "key_result_feedbacks")
@Getter
@Setter
public class KeyResultFeedback extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "key_result_id", nullable = false)
    private KeyResult keyResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "given_by_id")
    private Employee givenBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "rating")
    private Integer rating;
}
