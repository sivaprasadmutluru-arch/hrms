package com.example.demo.documents.repository;

import com.example.demo.documents.entity.EmployeeDocument;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long>, JpaSpecificationExecutor<EmployeeDocument> {

    // Eagerly fetch the employee relation — without this, Hibernate6Module silently
    // serializes it as null once the request-scoped session closes (open-in-view=false),
    // so the frontend's "Employee" column always shows "—" regardless of the real owner.
    @EntityGraph(attributePaths = "employee")
    List<EmployeeDocument> findByEmployeeId(Long employeeId);

    @EntityGraph(attributePaths = "employee")
    @Override
    List<EmployeeDocument> findAll(Specification<EmployeeDocument> spec);

    @EntityGraph(attributePaths = "employee")
    @Override
    List<EmployeeDocument> findAll();

    List<EmployeeDocument> findByDocumentRequestId(Long documentRequestId);
    Optional<EmployeeDocument> findByEmployeeIdAndDocumentRequestId(Long employeeId, Long documentRequestId);
}
