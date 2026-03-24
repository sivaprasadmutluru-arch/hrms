package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.Applicant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicantRepository extends JpaRepository<Applicant, Long>, JpaSpecificationExecutor<Applicant> {
    List<Applicant> findByRecruitmentId(Long recruitmentId);
    List<Applicant> findByCandidateId(Long candidateId);
    List<Applicant> findByCompanyId(Long companyId);
    List<Applicant> findByCompanyIdAndStatus(Long companyId, Applicant.ApplicantStatus status);
}
