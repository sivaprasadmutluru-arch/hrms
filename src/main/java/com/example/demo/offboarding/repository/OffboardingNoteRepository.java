package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OffboardingNoteRepository extends JpaRepository<OffboardingNote, Long>, JpaSpecificationExecutor<OffboardingNote> {
    List<OffboardingNote> findByEmployeeOffboardingId(Long employeeOffboardingId);
}
