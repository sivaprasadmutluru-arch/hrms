package com.example.demo.recruitment.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recruitment_question_orderings")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class QuestionOrdering extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private RecruitmentSurvey survey;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType questionType = QuestionType.TEXT;

    @Column(name = "ordering")
    private Integer ordering = 0;

    @Column(name = "is_required")
    private Boolean isRequired = false;

    public enum QuestionType {
        TEXT, CHOICE, MULTI_CHOICE, RATING, BOOLEAN
    }
}
