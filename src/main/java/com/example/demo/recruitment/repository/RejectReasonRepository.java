package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RejectReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RejectReasonRepository extends JpaRepository<RejectReason, Long>, JpaSpecificationExecutor<RejectReason> {
}
