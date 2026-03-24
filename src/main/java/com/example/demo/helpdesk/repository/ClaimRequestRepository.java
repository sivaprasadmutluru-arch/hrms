package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.ClaimRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ClaimRequestRepository extends JpaRepository<ClaimRequest, Long>, JpaSpecificationExecutor<ClaimRequest> {
    List<ClaimRequest> findByTicketId(Long ticketId);
}
