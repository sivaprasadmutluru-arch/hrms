package com.example.demo.base.repository;

import com.example.demo.base.entity.WorkTypeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface WorkTypeRequestRepository extends JpaRepository<WorkTypeRequest, Long>, JpaSpecificationExecutor<WorkTypeRequest> {
}
