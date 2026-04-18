package com.example.demo.documents.repository;

import com.example.demo.documents.entity.DocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, Long>, JpaSpecificationExecutor<DocumentRequest> {

    @Query("SELECT dr FROM DocumentRequest dr JOIN dr.employees e WHERE e.id = :employeeId")
    List<DocumentRequest> findByEmployeeId(@Param("employeeId") Long employeeId);
}
