package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.CandidateDocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateDocumentRequestRepository extends JpaRepository<CandidateDocumentRequest, Long>,
        JpaSpecificationExecutor<CandidateDocumentRequest> {
    List<CandidateDocumentRequest> findByCandidateId(Long candidateId);
    List<CandidateDocumentRequest> findByCompanyId(Long companyId);
}
