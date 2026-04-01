package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RecruitmentStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecruitmentStageRepository extends JpaRepository<RecruitmentStage, Long> {
    List<RecruitmentStage> findByRecruitmentId(Long recruitmentId);
    List<RecruitmentStage> findByRecruitmentIdOrderBySequenceAsc(Long recruitmentId);
}
