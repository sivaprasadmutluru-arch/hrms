package com.example.demo.pms.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "pms_questions")
@Getter
@Setter
public class Question extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private QuestionTemplate template;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType questionType = QuestionType.TEXT;

    @Column(name = "sequence")
    private Integer sequence = 0;

    public enum QuestionType {
        TEXT, MULTIPLE_CHOICE, RATING, YES_NO
    }
}
