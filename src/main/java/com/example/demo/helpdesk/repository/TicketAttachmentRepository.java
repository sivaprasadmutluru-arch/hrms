package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.TicketAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long>, JpaSpecificationExecutor<TicketAttachment> {
    List<TicketAttachment> findByTicketId(Long ticketId);
}
