package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.QuestionOrdering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOrderingRepository extends JpaRepository<QuestionOrdering, Long>, JpaSpecificationExecutor<QuestionOrdering> {
    List<QuestionOrdering> findBySurveyIdOrderByOrderingAsc(Long surveyId);
}
