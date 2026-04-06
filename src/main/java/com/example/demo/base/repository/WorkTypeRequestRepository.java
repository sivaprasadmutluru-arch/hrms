package com.example.demo.base.repository;

import com.example.demo.base.entity.WorkTypeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface WorkTypeRequestRepository extends JpaRepository<WorkTypeRequest, Long>, JpaSpecificationExecutor<WorkTypeRequest> {
    List<WorkTypeRequest> findByCompanyId(Long companyId);
}
