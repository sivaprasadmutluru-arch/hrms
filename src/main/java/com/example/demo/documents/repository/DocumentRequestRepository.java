package com.example.demo.documents.repository;

import com.example.demo.documents.entity.DocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, Long>, JpaSpecificationExecutor<DocumentRequest> {
}
