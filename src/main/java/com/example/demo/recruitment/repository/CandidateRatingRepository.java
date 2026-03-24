package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.CandidateRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CandidateRatingRepository extends JpaRepository<CandidateRating, Long>, JpaSpecificationExecutor<CandidateRating> {
    List<CandidateRating> findByCandidateId(Long candidateId);
    Optional<CandidateRating> findByRaterIdAndCandidateId(Long raterId, Long candidateId);
}
