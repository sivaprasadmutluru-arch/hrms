package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingStageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OffboardingStageFileRepository extends JpaRepository<OffboardingStageFile, Long>, JpaSpecificationExecutor<OffboardingStageFile> {
    List<OffboardingStageFile> findByStageId(Long stageId);
}
