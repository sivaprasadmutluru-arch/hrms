package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    List<Ticket> findByCompanyId(Long companyId);
    List<Ticket> findByRaisedById(Long employeeId);
    List<Ticket> findByAssignedToId(Long employeeId);
    List<Ticket> findByCompanyIdAndStatus(Long companyId, Ticket.TicketStatus status);
}
