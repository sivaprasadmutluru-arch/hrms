package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.StageNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface StageNoteRepository extends JpaRepository<StageNote, Long>, JpaSpecificationExecutor<StageNote> {
    List<StageNote> findByCandidateId(Long candidateId);
}
