package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.SurveyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyAnswerRepository extends JpaRepository<SurveyAnswer, Long>, JpaSpecificationExecutor<SurveyAnswer> {
    List<SurveyAnswer> findBySurveyId(Long surveyId);
    List<SurveyAnswer> findByCandidateId(Long candidateId);
}
