package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.SkillZoneCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface SkillZoneCandidateRepository extends JpaRepository<SkillZoneCandidate, Long>, JpaSpecificationExecutor<SkillZoneCandidate> {
    List<SkillZoneCandidate> findBySkillZoneId(Long skillZoneId);
}
