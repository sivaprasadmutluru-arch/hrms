package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RecruitmentSurvey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecruitmentSurveyRepository extends JpaRepository<RecruitmentSurvey, Long>, JpaSpecificationExecutor<RecruitmentSurvey> {
    List<RecruitmentSurvey> findByRecruitmentPostId(Long postId);
}
