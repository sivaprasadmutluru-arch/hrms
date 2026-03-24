package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RecruitmentPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecruitmentPostRepository extends JpaRepository<RecruitmentPost, Long>, JpaSpecificationExecutor<RecruitmentPost> {
    List<RecruitmentPost> findByCompanyId(Long companyId);
    List<RecruitmentPost> findByCompanyIdAndStatus(Long companyId, RecruitmentPost.RecruitmentStatus status);
    List<RecruitmentPost> findByIsPublishedTrue();
}
