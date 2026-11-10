package com.example.demo.documents.repository;

import com.example.demo.documents.entity.GeneratedLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GeneratedLetterRepository extends JpaRepository<GeneratedLetter, Long>, JpaSpecificationExecutor<GeneratedLetter> {

    List<GeneratedLetter> findByCompanyId(Long companyId);

    List<GeneratedLetter> findByEmployeeId(Long employeeId);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.employee.id = :employeeId OR (l.recipientEmail IS NOT NULL AND LOWER(l.recipientEmail) = LOWER(:email))")
    List<GeneratedLetter> findByEmployeeIdOrEmail(@Param("employeeId") Long employeeId, @Param("email") String email);

    List<GeneratedLetter> findByLetterType(GeneratedLetter.LetterType letterType);

    boolean existsByReferenceNumber(String referenceNumber);

    long countByCompanyIdAndLetterType(Long companyId, GeneratedLetter.LetterType letterType);
}
