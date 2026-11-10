package com.example.demo.helpdesk.controller;

import com.example.demo.helpdesk.entity.Ticket;
import com.example.demo.helpdesk.entity.TicketAttachment;
import com.example.demo.helpdesk.entity.TicketComment;
import com.example.demo.helpdesk.service.HelpdeskService;
import io.swagger.v3.oas.annotations.Operation;
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

    private final HelpdeskService helpdeskService;

    @GetMapping("/assignees")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    public ResponseEntity<Map<String,Object>> assignees(@RequestParam Long companyId,@RequestParam(defaultValue="") String search) {
        if(search.length()>150)throw new com.example.demo.common.exception.BadRequestException("Search is too long");
        return ResponseEntity.ok(helpdeskService.departmentManagerOptions(companyId,search));
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    public ResponseEntity<List<Map<String,Object>>> departments(@RequestParam Long companyId) {
        return ResponseEntity.ok(helpdeskService.ticketDepartments(companyId));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List all tickets (company-scoped)")
    public ResponseEntity<List<Map<String,Object>>> list() {
        return ResponseEntity.ok(helpdeskService.listTicketViews(null,null,null,null,null,null,null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Get a ticket by ID")
    public ResponseEntity<Map<String,Object>> get(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.getTicketById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Operation(summary = "Create a new ticket")
    public ResponseEntity<Map<String,Object>> create(@RequestBody Ticket ticket) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.createTicket(ticket)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    @Operation(summary = "Update a ticket")
    public ResponseEntity<Map<String,Object>> update(@PathVariable Long id, @RequestBody Ticket updated) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.updateTicket(id, updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('helpdesk:delete')")
    @Operation(summary = "Soft-delete a ticket")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        helpdeskService.deleteTicket(id);
        return ResponseEntity.ok(Map.of("message", "Ticket deactivated"));
    }

    @PostMapping("/{id}/assign/{assigneeId}")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    @Operation(summary = "Assign a ticket to an employee")
    public ResponseEntity<Map<String,Object>> assign(@PathVariable Long id, @PathVariable Long assigneeId) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.assignTicket(id, assigneeId)));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('helpdesk:edit') or @helpdeskService.isAssignedToCurrentUser(#id)")
    @Operation(summary = "Mark a ticket as resolved")
    public ResponseEntity<Map<String,Object>> resolve(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.resolveTicket(id)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('helpdesk:edit') or @helpdeskService.isAssignedToCurrentUser(#id)")
    @Operation(summary = "Close a ticket")
    public ResponseEntity<Map<String,Object>> close(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.closeTicket(id)));
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('helpdesk:edit') or @helpdeskService.isAssignedToCurrentUser(#id)")
    @Operation(summary = "Reopen a closed or resolved ticket")
    public ResponseEntity<Map<String,Object>> reopen(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.reopenTicket(id)));
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAuthority('helpdesk:edit')")
    @Operation(summary = "Escalate a ticket to CRITICAL if past SLA (default 48h)")
    public ResponseEntity<Map<String,Object>> escalate(@PathVariable Long id,
                                           @RequestParam(defaultValue = "48") int slaHours) {
        return ResponseEntity.ok(helpdeskService.routingView(helpdeskService.escalateTicket(id, slaHours)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Search tickets by keyword, status, type, and priority")
    public ResponseEntity<List<Map<String,Object>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Ticket.TicketStatus status,
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) Ticket.Priority priority) {
        return ResponseEntity.ok(helpdeskService.listTicketViews(keyword,status,typeId,priority,null,null,null));
    }

    @GetMapping("/by-employee/{employeeId}")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Get tickets raised by a specific employee")
    public ResponseEntity<List<Map<String,Object>>> byEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(helpdeskService.listTicketViews(null,null,null,null,employeeId,null,null));
    }

    @GetMapping("/by-assignee/{employeeId}")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Get tickets assigned to a specific employee")
    public ResponseEntity<List<Map<String,Object>>> byAssignee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(helpdeskService.listTicketViews(null,null,null,null,null,employeeId,null));
    }

    @GetMapping("/by-department/{departmentId}")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Get tickets raised by employees in a specific department")
    public ResponseEntity<List<Map<String,Object>>> byDepartment(@PathVariable Long departmentId) {
        return ResponseEntity.ok(helpdeskService.listTicketViews(null,null,null,null,null,null,departmentId));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "Get helpdesk dashboard statistics")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(helpdeskService.getDashboard());
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List comments for a ticket")
    public ResponseEntity<List<Map<String,Object>>> listComments(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.listComments(id).stream().map(helpdeskService::commentView).toList());
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Operation(summary = "Add a comment to a ticket")
    public ResponseEntity<Map<String,Object>> addComment(@PathVariable Long id,
                                                     @RequestBody Map<String, Object> body) {
        String comment = (String) body.get("comment");
        Long commentedById = null; // Ignore supplied author; use the authenticated employee.
        return ResponseEntity.ok(helpdeskService.commentView(helpdeskService.addComment(id, comment, commentedById)));
    }

    // ─── Attachments ──────────────────────────────────────────────────────────

    @GetMapping("/{ticketId}/attachments")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List attachments for a ticket")
    public ResponseEntity<List<Map<String,Object>>> listAttachments(@PathVariable Long ticketId) {
        return ResponseEntity.ok(helpdeskService.listAttachments(ticketId).stream().map(helpdeskService::attachmentView).toList());
    }

    @PostMapping("/{ticketId}/attachments")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Operation(summary = "Add an attachment to a ticket")
    public ResponseEntity<Map<String,Object>> addAttachment(@PathVariable Long ticketId,
                                                           @RequestBody TicketAttachment attachment) {
        return ResponseEntity.ok(helpdeskService.attachmentView(helpdeskService.addAttachment(ticketId, attachment)));
    }

    @DeleteMapping("/attachments/{id}")
    @PreAuthorize("hasAuthority('helpdesk:delete')")
    @Operation(summary = "Delete a ticket attachment")
    public ResponseEntity<Map<String, String>> deleteAttachment(@PathVariable Long id) {
        helpdeskService.deleteAttachment(id);
        return ResponseEntity.ok(Map.of("message", "Attachment deleted"));
    }
}
