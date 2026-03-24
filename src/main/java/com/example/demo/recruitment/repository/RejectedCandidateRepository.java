package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RejectedCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RejectedCandidateRepository extends JpaRepository<RejectedCandidate, Long>,
        JpaSpecificationExecutor<RejectedCandidate> {
    List<RejectedCandidate> findByCompanyId(Long companyId);
    List<RejectedCandidate> findByCandidateId(Long candidateId);
}
