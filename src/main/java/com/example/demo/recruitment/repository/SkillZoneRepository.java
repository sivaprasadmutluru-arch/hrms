package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.SkillZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SkillZoneRepository extends JpaRepository<SkillZone, Long>, JpaSpecificationExecutor<SkillZone> {
}
