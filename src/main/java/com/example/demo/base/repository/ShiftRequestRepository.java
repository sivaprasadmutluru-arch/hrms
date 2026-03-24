package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ShiftRequestRepository extends JpaRepository<ShiftRequest, Long>, JpaSpecificationExecutor<ShiftRequest> {
}
