package com.example.demo.helpdesk.controller;

import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.helpdesk.entity.Ticket;
import com.example.demo.helpdesk.entity.TicketComment;
import com.example.demo.helpdesk.repository.TicketCommentRepository;
import com.example.demo.helpdesk.repository.TicketRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/helpdesk/tickets")
@RequiredArgsConstructor
@Tag(name = "Helpdesk")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('helpdesk:view')")
    public ResponseEntity<List<Ticket>> list() {
        var spec = ScopeFilter.<Ticket>byCompany();
        return ResponseEntity.ok(spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    public ResponseEntity<Ticket> get(@PathVariable Long id) {
        return ResponseEntity.ok(ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('helpdesk:create')")
    public ResponseEntity<Ticket> create(@RequestBody Ticket ticket) {
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    public ResponseEntity<Ticket> update(@PathVariable Long id, @RequestBody Ticket updated) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
        ticket.setTitle(updated.getTitle());
        ticket.setDescription(updated.getDescription());
        ticket.setStatus(updated.getStatus());
        ticket.setPriority(updated.getPriority());
        ticket.setAssignedTo(updated.getAssignedTo());
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    public ResponseEntity<Ticket> resolve(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
        ticket.setStatus(Ticket.TicketStatus.RESOLVED);
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    public ResponseEntity<Ticket> close(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
        ticket.setStatus(Ticket.TicketStatus.CLOSED);
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
        ticket.setActive(false);
        ticketRepository.save(ticket);
        return ResponseEntity.ok(Map.of("message", "Ticket deactivated"));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    public ResponseEntity<List<TicketComment>> listComments(@PathVariable Long id) {
        return ResponseEntity.ok(ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(id));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    public ResponseEntity<TicketComment> addComment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setComment((String) body.get("comment"));
        if (body.get("commentedById") != null) {
            Long commentedById = Long.parseLong(body.get("commentedById").toString());
            employeeRepository.findById(commentedById).ifPresent(comment::setCommentedBy);
        }
        return ResponseEntity.ok(ticketCommentRepository.save(comment));
    }
}
