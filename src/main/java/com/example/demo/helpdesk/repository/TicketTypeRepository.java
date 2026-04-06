package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketTypeRepository extends JpaRepository<TicketType, Long>, JpaSpecificationExecutor<TicketType> {
    List<TicketType> findByCompanyId(Long companyId);
}
