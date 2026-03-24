package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.StageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StageFileRepository extends JpaRepository<StageFile, Long>, JpaSpecificationExecutor<StageFile> {
    List<StageFile> findByStageId(Long stageId);
}
