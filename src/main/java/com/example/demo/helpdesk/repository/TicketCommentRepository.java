package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long>, JpaSpecificationExecutor<TicketComment> {
    List<TicketComment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
