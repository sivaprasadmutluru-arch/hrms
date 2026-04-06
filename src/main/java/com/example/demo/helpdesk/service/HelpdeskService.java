package com.example.demo.helpdesk.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.helpdesk.entity.*;
import com.example.demo.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HelpdeskService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final ClaimRequestRepository claimRequestRepository;
    private final FAQRepository faqRepository;
    private final FAQCategoryRepository faqCategoryRepository;
    private final DepartmentManagerRepository departmentManagerRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;

    // ─── Ticket CRUD ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Ticket> listTickets() {
        Specification<Ticket> spec = ScopeFilter.byCompany();
        return spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Ticket getTicketById(Long id) {
        return findTicket(id);
    }

    @Transactional
    public Ticket createTicket(Ticket ticket) {
        if (ticket.getRaisedBy() != null && ticket.getRaisedBy().getId() != null) {
            ticket.setRaisedBy(employeeRepository.getReferenceById(ticket.getRaisedBy().getId()));
        }
        if (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId() != null) {
            ticket.setAssignedTo(employeeRepository.getReferenceById(ticket.getAssignedTo().getId()));
        }
        if (ticket.getCompany() != null && ticket.getCompany().getId() != null) {
            ticket.setCompany(companyRepository.getReferenceById(ticket.getCompany().getId()));
        }
        if (ticket.getTicketType() != null && ticket.getTicketType().getId() != null) {
            ticket.setTicketType(ticketTypeRepository.getReferenceById(ticket.getTicketType().getId()));
        }
        log.info("Creating ticket: {}", ticket.getTitle());
        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket updateTicket(Long id, Ticket updated) {
        Ticket ticket = findTicket(id);
        ticket.setTitle(updated.getTitle());
        ticket.setDescription(updated.getDescription());
        ticket.setStatus(updated.getStatus());
        ticket.setPriority(updated.getPriority());
        if (updated.getAssignedTo() != null && updated.getAssignedTo().getId() != null) {
            ticket.setAssignedTo(employeeRepository.getReferenceById(updated.getAssignedTo().getId()));
        } else {
            ticket.setAssignedTo(updated.getAssignedTo());
        }
        if (updated.getTicketType() != null && updated.getTicketType().getId() != null) {
            ticket.setTicketType(ticketTypeRepository.getReferenceById(updated.getTicketType().getId()));
        }
        log.info("Updating ticket id={}", id);
        return ticketRepository.save(ticket);
    }

    @Transactional
    public void deleteTicket(Long id) {
        Ticket ticket = findTicket(id);
        ticket.setActive(false);
        ticketRepository.save(ticket);
        log.info("Soft-deleted ticket id={}", id);
    }

    // ─── Ticket Status Transitions ────────────────────────────────────────────

    @Transactional
    public Ticket assignTicket(Long ticketId, Long assigneeId) {
        Ticket ticket = findTicket(ticketId);
        ticket.setAssignedTo(employeeRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", assigneeId)));
        if (ticket.getStatus() == Ticket.TicketStatus.OPEN) {
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        }
        log.info("Assigned ticket id={} to employee id={}", ticketId, assigneeId);
        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket resolveTicket(Long ticketId) {
        Ticket ticket = findTicket(ticketId);
        ticket.setStatus(Ticket.TicketStatus.RESOLVED);
        log.info("Resolved ticket id={}", ticketId);
        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket closeTicket(Long ticketId) {
        Ticket ticket = findTicket(ticketId);
        ticket.setStatus(Ticket.TicketStatus.CLOSED);
        log.info("Closed ticket id={}", ticketId);
        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket reopenTicket(Long ticketId) {
        Ticket ticket = findTicket(ticketId);
        ticket.setStatus(Ticket.TicketStatus.OPEN);
        log.info("Reopened ticket id={}", ticketId);
        return ticketRepository.save(ticket);
    }

    /**
     * Escalates a ticket by raising its priority to CRITICAL if it is not yet resolved
     * and was created more than the given SLA hours ago.
     *
     * @param ticketId the ticket to evaluate
     * @param slaHours number of hours after which an unresolved ticket is considered overdue
     * @return the (possibly updated) ticket
     */
    @Transactional
    public Ticket escalateTicket(Long ticketId, int slaHours) {
        Ticket ticket = findTicket(ticketId);
        boolean isUnresolved = ticket.getStatus() != Ticket.TicketStatus.RESOLVED
                && ticket.getStatus() != Ticket.TicketStatus.CLOSED;
        boolean isPastSla = ticket.getCreatedAt() != null
                && ticket.getCreatedAt().plusHours(slaHours).isBefore(LocalDateTime.now());
        if (isUnresolved && isPastSla) {
            ticket.setPriority(Ticket.Priority.CRITICAL);
            log.info("Escalated ticket id={} to CRITICAL (past SLA of {}h)", ticketId, slaHours);
            return ticketRepository.save(ticket);
        }
        log.info("Ticket id={} does not require escalation", ticketId);
        return ticket;
    }

    // ─── Comments & Attachments ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TicketComment> listComments(Long ticketId) {
        findTicket(ticketId);
        return ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional
    public TicketComment addComment(Long ticketId, String commentText, Long commentedById) {
        Ticket ticket = findTicket(ticketId);
        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setComment(commentText);
        comment.setCommentedBy(employeeRepository.findById(commentedById)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", commentedById)));
        log.info("Adding comment to ticket id={} by employee id={}", ticketId, commentedById);
        return ticketCommentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketAttachment> listAttachments(Long ticketId) {
        return ticketAttachmentRepository.findByTicketId(ticketId);
    }

    @Transactional
    public TicketAttachment addAttachment(Long ticketId, TicketAttachment attachment) {
        attachment.setTicket(ticketRepository.getReferenceById(ticketId));
        log.info("Adding attachment to ticket id={}", ticketId);
        return ticketAttachmentRepository.save(attachment);
    }

    @Transactional
    public void deleteAttachment(Long attachmentId) {
        ticketAttachmentRepository.deleteById(attachmentId);
        log.info("Deleted attachment id={}", attachmentId);
    }

    // ─── Ticket Queries ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByEmployee(Long employeeId) {
        return ticketRepository.findByRaisedById(employeeId);
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByAssignee(Long employeeId) {
        return ticketRepository.findByAssignedToId(employeeId);
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByDepartment(Long departmentId) {
        Specification<Ticket> spec = ScopeFilter.byCompany();
        List<Ticket> all = spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();
        return all.stream()
                .filter(t -> t.getRaisedBy() != null
                        && t.getRaisedBy().getDepartment() != null
                        && departmentId.equals(t.getRaisedBy().getDepartment().getId()))
                .collect(Collectors.toList());
    }

    /**
     * Searches tickets by optional keyword (matches title or description), status, type, and priority.
     * All filtering is applied in-memory after the company-scoped query for flexibility.
     */
    @Transactional(readOnly = true)
    public List<Ticket> searchTickets(String keyword, Ticket.TicketStatus status,
                                      Long typeId, Ticket.Priority priority) {
        Specification<Ticket> spec = ScopeFilter.byCompany();
        List<Ticket> all = spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();
        return all.stream()
                .filter(t -> keyword == null || keyword.isBlank()
                        || (t.getTitle() != null && t.getTitle().toLowerCase().contains(keyword.toLowerCase()))
                        || (t.getDescription() != null && t.getDescription().toLowerCase().contains(keyword.toLowerCase())))
                .filter(t -> status == null || status == t.getStatus())
                .filter(t -> typeId == null
                        || (t.getTicketType() != null && typeId.equals(t.getTicketType().getId())))
                .filter(t -> priority == null || priority == t.getPriority())
                .collect(Collectors.toList());
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    /**
     * Returns aggregated helpdesk statistics visible to the current user's scope.
     * Overdue tickets are those that are OPEN or IN_PROGRESS and were created more than 48 hours ago.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard() {
        Specification<Ticket> spec = ScopeFilter.byCompany();
        List<Ticket> tickets = spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();

        LocalDateTime overdueThreshold = LocalDateTime.now().minusHours(48);

        long total = tickets.size();
        long open = tickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.OPEN).count();
        long inProgress = tickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.IN_PROGRESS).count();
        long resolved = tickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.RESOLVED).count();
        long closed = tickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.CLOSED).count();
        long pending = open + inProgress;
        long overdue = tickets.stream()
                .filter(t -> (t.getStatus() == Ticket.TicketStatus.OPEN
                        || t.getStatus() == Ticket.TicketStatus.IN_PROGRESS)
                        && t.getCreatedAt() != null
                        && t.getCreatedAt().isBefore(overdueThreshold))
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("open", open);
        result.put("inProgress", inProgress);
        result.put("resolved", resolved);
        result.put("closed", closed);
        result.put("pending", pending);
        result.put("overdue", overdue);
        return result;
    }

    // ─── TicketType CRUD ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TicketType> listTicketTypes() {
        Specification<TicketType> spec = ScopeFilter.byCompany();
        return spec != null ? ticketTypeRepository.findAll(spec) : ticketTypeRepository.findAll();
    }

    @Transactional
    public TicketType createTicketType(TicketType type) {
        if (type.getCompany() != null && type.getCompany().getId() != null) {
            type.setCompany(companyRepository.getReferenceById(type.getCompany().getId()));
        }
        return ticketTypeRepository.save(type);
    }

    @Transactional
    public TicketType updateTicketType(Long id, TicketType updated) {
        TicketType type = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", id));
        type.setName(updated.getName());
        return ticketTypeRepository.save(type);
    }

    @Transactional
    public void deleteTicketType(Long id) {
        TicketType type = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", id));
        type.setActive(false);
        ticketTypeRepository.save(type);
        log.info("Soft-deleted TicketType id={}", id);
    }

    // ─── FAQ Category CRUD ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FAQCategory> listFAQCategories() {
        Specification<FAQCategory> spec = ScopeFilter.byCompany();
        return spec != null ? faqCategoryRepository.findAll(spec) : faqCategoryRepository.findAll();
    }

    @Transactional
    public FAQCategory createFAQCategory(FAQCategory category) {
        if (category.getCompany() != null && category.getCompany().getId() != null) {
            category.setCompany(companyRepository.getReferenceById(category.getCompany().getId()));
        }
        return faqCategoryRepository.save(category);
    }

    @Transactional
    public FAQCategory updateFAQCategory(Long id, FAQCategory updated) {
        FAQCategory category = faqCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQCategory", id));
        category.setTitle(updated.getTitle());
        category.setDescription(updated.getDescription());
        return faqCategoryRepository.save(category);
    }

    @Transactional
    public void deleteFAQCategory(Long id) {
        faqCategoryRepository.deleteById(id);
        log.info("Deleted FAQCategory id={}", id);
    }

    // ─── FAQ CRUD ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FAQ> listFAQs(Long categoryId) {
        if (categoryId != null) {
            return faqRepository.findByCategoryId(categoryId);
        }
        Specification<FAQ> spec = ScopeFilter.byCompany();
        return spec != null ? faqRepository.findAll(spec) : faqRepository.findAll();
    }

    @Transactional
    public FAQ createFAQ(FAQ faq) {
        if (faq.getCategory() != null && faq.getCategory().getId() != null) {
            faq.setCategory(faqCategoryRepository.getReferenceById(faq.getCategory().getId()));
        }
        if (faq.getCompany() != null && faq.getCompany().getId() != null) {
            faq.setCompany(companyRepository.getReferenceById(faq.getCompany().getId()));
        }
        return faqRepository.save(faq);
    }

    @Transactional
    public FAQ updateFAQ(Long id, FAQ updated) {
        FAQ faq = faqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQ", id));
        faq.setQuestion(updated.getQuestion());
        faq.setAnswer(updated.getAnswer());
        return faqRepository.save(faq);
    }

    @Transactional
    public void deleteFAQ(Long id) {
        faqRepository.deleteById(id);
        log.info("Deleted FAQ id={}", id);
    }

    // ─── ClaimRequest CRUD ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ClaimRequest> listClaims() {
        Specification<ClaimRequest> spec = ScopeFilter.byEmployee();
        return spec != null ? claimRequestRepository.findAll(spec) : claimRequestRepository.findAll();
    }

    @Transactional
    public ClaimRequest createClaim(ClaimRequest claim) {
        if (claim.getEmployee() != null && claim.getEmployee().getId() != null) {
            claim.setEmployee(employeeRepository.getReferenceById(claim.getEmployee().getId()));
        }
        if (claim.getCompany() != null && claim.getCompany().getId() != null) {
            claim.setCompany(companyRepository.getReferenceById(claim.getCompany().getId()));
        }
        if (claim.getTicket() != null && claim.getTicket().getId() != null) {
            claim.setTicket(ticketRepository.getReferenceById(claim.getTicket().getId()));
        }
        log.info("Creating claim request for employee id={}", claim.getEmployee() != null ? claim.getEmployee().getId() : null);
        return claimRequestRepository.save(claim);
    }

    @Transactional
    public ClaimRequest approveClaim(Long id) {
        ClaimRequest claim = claimRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClaimRequest", id));
        claim.setIsApproved(true);
        claim.setIsRejected(false);
        log.info("Approved ClaimRequest id={}", id);
        return claimRequestRepository.save(claim);
    }

    @Transactional
    public ClaimRequest rejectClaim(Long id) {
        ClaimRequest claim = claimRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClaimRequest", id));
        claim.setIsRejected(true);
        claim.setIsApproved(false);
        log.info("Rejected ClaimRequest id={}", id);
        return claimRequestRepository.save(claim);
    }

    @Transactional
    public void deleteClaim(Long id) {
        ClaimRequest claim = claimRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClaimRequest", id));
        claim.setActive(false);
        claimRequestRepository.save(claim);
        log.info("Soft-deleted ClaimRequest id={}", id);
    }

    // ─── Department Managers ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DepartmentManager> listDepartmentManagers(Long departmentId) {
        if (departmentId != null) {
            return departmentManagerRepository.findByDepartmentId(departmentId);
        }
        Specification<DepartmentManager> spec = ScopeFilter.byCompany();
        return spec != null ? departmentManagerRepository.findAll(spec) : departmentManagerRepository.findAll();
    }

    @Transactional
    public DepartmentManager assignDepartmentManager(DepartmentManager dm) {
        if (dm.getDepartment() != null && dm.getDepartment().getId() != null) {
            dm.setDepartment(departmentRepository.getReferenceById(dm.getDepartment().getId()));
        }
        if (dm.getManager() != null && dm.getManager().getId() != null) {
            dm.setManager(employeeRepository.getReferenceById(dm.getManager().getId()));
        }
        if (dm.getCompany() != null && dm.getCompany().getId() != null) {
            dm.setCompany(companyRepository.getReferenceById(dm.getCompany().getId()));
        }
        log.info("Assigning department manager for department id={}", dm.getDepartment() != null ? dm.getDepartment().getId() : null);
        return departmentManagerRepository.save(dm);
    }

    @Transactional
    public void removeDepartmentManager(Long id) {
        departmentManagerRepository.deleteById(id);
        log.info("Removed DepartmentManager id={}", id);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private Ticket findTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
    }
}
