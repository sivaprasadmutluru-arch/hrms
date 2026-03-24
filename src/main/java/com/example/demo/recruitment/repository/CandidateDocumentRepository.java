package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.CandidateDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateDocumentRepository extends JpaRepository<CandidateDocument, Long>, JpaSpecificationExecutor<CandidateDocument> {
    List<CandidateDocument> findByCandidateId(Long candidateId);
    List<CandidateDocument> findByRequestId(Long requestId);
}
