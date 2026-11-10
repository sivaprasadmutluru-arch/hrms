package com.example.demo.helpdesk.service;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.helpdesk.entity.*;
import com.example.demo.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    @Transactional(readOnly=true)
    public List<Map<String,Object>> ticketDepartments(Long companyId) {
        com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(companyId);
        return departmentRepository.findByCompanyIdAndIsActiveTrue(companyId).stream().map(d->{
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",d.getId());m.put("name",d.getName());return m;
        }).toList();
    }
    @Transactional(readOnly=true)
    public Map<String,Object> routingView(Ticket detached) {
        // Entity references returned by earlier service calls are detached when OSIV is off.
        // Load the managed ticket inside this transaction before reading lazy relationships.
        Ticket t=findTicket(detached.getId());
        return routingViewManaged(t);
    }
    private Map<String,Object> routingViewManaged(Ticket t) {
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",t.getId());m.put("title",t.getTitle());m.put("subject",t.getTitle());m.put("description",t.getDescription());m.put("status",t.getStatus());m.put("priority",t.getPriority());m.put("createdAt",t.getCreatedAt());m.put("companyId",t.getCompany().getId());
        m.put("department",t.getDepartment()==null?null:Map.of("id",t.getDepartment().getId(),"name",t.getDepartment().getName()));
        m.put("assignedTo",t.getAssignedTo()==null?null:Map.of("id",t.getAssignedTo().getId(),"name",employeeName(t.getAssignedTo())));
        m.put("requesterName",t.getRaisedBy()==null?"":employeeName(t.getRaisedBy()));
        var auth=SecurityContextHolder.getContext().getAuthentication();
        boolean editor=auth!=null && auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("helpdesk:edit"));
        m.put("canReassign",editor);m.put("canHandle",editor || assignedToCurrentUser(t));return m;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> commentView(TicketComment detached) {
        var c=ticketCommentRepository.findById(detached.getId()).orElseThrow(()->new ResourceNotFoundException("Comment",detached.getId()));
        findTicket(c.getTicket().getId());
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",c.getId());m.put("comment",c.getComment());m.put("createdAt",c.getCreatedAt());m.put("authorName",employeeName(c.getCommentedBy()));return m;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> attachmentView(TicketAttachment detached) {
        var a=ticketAttachmentRepository.findById(detached.getId()).orElseThrow(()->new ResourceNotFoundException("Attachment",detached.getId()));
        findTicket(a.getTicket().getId());
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",a.getId());m.put("filePath",a.getFilePath());m.put("fileName",a.getFileName());m.put("fileSize",a.getFileSize());return m;
    }
    @Transactional(readOnly=true)
    public boolean isAssignedToCurrentUser(Long ticketId) {
        var scope=AccessScopeContext.get();
        if(scope==null)return false;
        var ticket=findTicket(ticketId);
        return assignedToCurrentUser(ticket);
    }
    private String employeeName(com.example.demo.employee.entity.Employee e) {
        return java.util.stream.Stream.of(e.getFirstName(),e.getLastName()).filter(java.util.Objects::nonNull).collect(Collectors.joining(" ")).strip();
    }

    private boolean assignedToCurrentUser(Ticket ticket) {
        var scope=AccessScopeContext.get();
        return scope!=null && ticket.getAssignedTo()!=null && ticket.getAssignedTo().getUser()!=null
            && ticket.getAssignedTo().getUser().getId().equals(scope.getUserId());
    }

    /** Fetch and map the response in one transaction, without per-row reloads. */
    @Transactional(readOnly=true)
    public List<Map<String,Object>> listTicketViews(String keyword, Ticket.TicketStatus status,
            Long typeId, Ticket.Priority priority, Long employeeId, Long assigneeId, Long departmentId) {
        Specification<Ticket> spec=visibleTickets();
        spec=spec.and((root,query,cb)-> {
            var predicates=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if(keyword!=null && !keyword.isBlank()) {
                String pattern="%"+keyword.toLowerCase(java.util.Locale.ROOT)+"%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")),pattern),cb.like(cb.lower(root.get("description")),pattern)));
            }
            if(status!=null)predicates.add(cb.equal(root.get("status"),status));
            if(priority!=null)predicates.add(cb.equal(root.get("priority"),priority));
            if(typeId!=null)predicates.add(cb.equal(root.get("ticketType").get("id"),typeId));
            if(employeeId!=null)predicates.add(cb.equal(root.get("raisedBy").get("id"),employeeId));
            if(assigneeId!=null)predicates.add(cb.equal(root.get("assignedTo").get("id"),assigneeId));
            if(departmentId!=null)predicates.add(cb.equal(root.get("department").get("id"),departmentId));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        });
        return ticketRepository.findAll(spec).stream().map(this::routingViewManaged).toList();
    }
    private Specification<Ticket> visibleTickets() {
        Specification<Ticket> spec=ScopeFilter.byCompanyOrAll();
        var scope=AccessScopeContext.get();
        if(scope!=null && scope.isSelfScope()) {
            Long userId=scope.getUserId();
            spec=spec.and((root,query,cb)->cb.or(
                cb.equal(root.join("raisedBy",jakarta.persistence.criteria.JoinType.LEFT).get("user").get("id"),userId),
                cb.equal(root.join("assignedTo",jakarta.persistence.criteria.JoinType.LEFT).get("user").get("id"),userId)));
        }
        return spec;
    }

    // ─── Ticket CRUD ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Ticket> listTickets() {
        Specification<Ticket> spec = visibleTickets();
        return spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Ticket getTicketById(Long id) {
        return findTicket(id);
    }

    @Transactional
    public Ticket createTicket(Ticket ticket) {
        if(ticket.getId()!=null || ticket.getTitle()==null || ticket.getTitle().isBlank() || ticket.getTitle().length()>255)
            throw new com.example.demo.common.exception.BadRequestException("Enter a subject of up to 255 characters");
        var scope=AccessScopeContext.get();
        if(scope==null || scope.getUserId()==null)throw new org.springframework.security.access.AccessDeniedException("Sign in required");
        ticket.setRaisedBy(employeeRepository.findByUserId(scope.getUserId()).orElse(null));
        if(ticket.getRaisedBy()==null || !ticket.getRaisedBy().isActive() || ticket.getRaisedBy().getCompany()==null)
            throw new com.example.demo.common.exception.BadRequestException("An active employee profile is required to raise a ticket");
        var company=ticket.getRaisedBy().getCompany();
        com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(company.getId());
        ticket.setCompany(company);
        ticket.setAssignedTo(null); // Clients cannot override department routing during creation.
        ticket.setStatus(Ticket.TicketStatus.OPEN);
        if(ticket.getDepartment()!=null && ticket.getDepartment().getId()!=null) {
            Long departmentId=ticket.getDepartment().getId();
            var department=departmentRepository.findById(departmentId).orElseThrow(()->new ResourceNotFoundException("Department",departmentId));
            if(!department.isActive() || !company.getId().equals(department.getCompany().getId()))
                throw new com.example.demo.common.exception.BadRequestException("Choose an active department in the ticket company");
            ticket.setDepartment(department);
            ticket.setAssignedTo(departmentManagerRepository.findByDepartmentId(departmentId).stream()
                .filter(a->a.isActive() && a.getManager().isActive() && a.getManager().getUser()!=null && a.getManager().getUser().isActive() && a.getManager().getCompany()!=null && company.getId().equals(a.getManager().getCompany().getId()))
                .sorted(java.util.Comparator.comparing(DepartmentManager::getId))
                .map(DepartmentManager::getManager).findFirst().orElse(null));
        } else ticket.setDepartment(null);
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
            var assignee=employeeRepository.findById(updated.getAssignedTo().getId()).orElseThrow(()->new ResourceNotFoundException("Employee",updated.getAssignedTo().getId()));
            if(!assignee.isActive() || assignee.getCompany()==null || !ticket.getCompany().getId().equals(assignee.getCompany().getId()))throw new com.example.demo.common.exception.BadRequestException("Choose an active employee in the ticket company");
            ticket.setAssignedTo(assignee);
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
        var assignee=employeeRepository.findById(assigneeId).orElseThrow(()->new ResourceNotFoundException("Employee",assigneeId));
        if(!assignee.isActive() || assignee.getUser()==null || !assignee.getUser().isActive() || assignee.getCompany()==null || !ticket.getCompany().getId().equals(assignee.getCompany().getId()))
            throw new com.example.demo.common.exception.BadRequestException("Choose an active employee with a login in the ticket company");
        ticket.setAssignedTo(assignee);
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
        if(commentText==null || commentText.isBlank() || commentText.length()>10000)throw new com.example.demo.common.exception.BadRequestException("Enter a comment of up to 10000 characters");
        comment.setComment(commentText.strip());
        var scope=AccessScopeContext.get();
        if(scope==null)throw new org.springframework.security.access.AccessDeniedException("Sign in required");
        comment.setCommentedBy(employeeRepository.findByUserId(scope.getUserId()).orElseThrow(()->new com.example.demo.common.exception.BadRequestException("An employee profile is required to comment")));
        log.info("Adding comment to ticket id={} by employee id={}", ticketId, commentedById);
        return ticketCommentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public List<TicketAttachment> listAttachments(Long ticketId) {
        findTicket(ticketId);
        return ticketAttachmentRepository.findByTicketId(ticketId);
    }

    @Transactional
    public TicketAttachment addAttachment(Long ticketId, TicketAttachment attachment) {
        attachment.setTicket(findTicket(ticketId));
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
        return listTickets().stream().filter(t->t.getRaisedBy()!=null && t.getRaisedBy().getId().equals(employeeId)).toList();
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByAssignee(Long employeeId) {
        return listTickets().stream().filter(t->t.getAssignedTo()!=null && t.getAssignedTo().getId().equals(employeeId)).toList();
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByDepartment(Long departmentId) {
        Specification<Ticket> spec = visibleTickets();
        List<Ticket> all = spec != null ? ticketRepository.findAll(spec) : ticketRepository.findAll();
        return all.stream()
                .filter(t -> t.getDepartment()!=null && departmentId.equals(t.getDepartment().getId()))
                .collect(Collectors.toList());
    }

    /**
     * Searches tickets by optional keyword (matches title or description), status, type, and priority.
     * All filtering is applied in-memory after the company-scoped query for flexibility.
     */
    @Transactional(readOnly = true)
    public List<Ticket> searchTickets(String keyword, Ticket.TicketStatus status,
                                      Long typeId, Ticket.Priority priority) {
        Specification<Ticket> spec = visibleTickets();
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
        Specification<Ticket> spec = visibleTickets();
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

    private void requireDepartmentAccess(com.example.demo.base.entity.Department department) {
        if(department.getCompany()==null) throw new com.example.demo.common.exception.BadRequestException("Department has no company");
        com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(department.getCompany().getId());
    }

    private Map<String,Object> departmentManagerView(DepartmentManager assignment) {
        var employee=assignment.getManager();var department=assignment.getDepartment();
        Map<String,Object> person=new LinkedHashMap<>();person.put("id",employee.getId());person.put("firstName",employee.getFirstName());person.put("lastName",employee.getLastName());person.put("email",employee.getEmail());
        return Map.of("id",assignment.getId(),"department",Map.of("id",department.getId(),"name",department.getName()),"manager",person,"companyId",department.getCompany().getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> listDepartmentManagers(Long departmentId) {
        if(departmentId!=null) requireDepartmentAccess(departmentRepository.findById(departmentId).orElseThrow(()->new ResourceNotFoundException("Department",departmentId)));
        var scope=AccessScopeContext.get();
        boolean platform=SecurityContextHolder.getContext().getAuthentication()!=null && SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));
        if(scope==null && !platform)throw new org.springframework.security.access.AccessDeniedException("Company access required");
        Specification<DepartmentManager> spec=(root,query,cb)->cb.and(cb.isTrue(root.get("isActive")),cb.isTrue(root.get("manager").get("isActive")),cb.isTrue(root.get("department").get("isActive")));
        if(departmentId!=null)spec=spec.and((root,query,cb)->cb.equal(root.get("department").get("id"),departmentId));
        if(scope!=null && !scope.hasUnrestrictedAccess())spec=spec.and((root,query,cb)->root.get("department").get("company").get("id").in(scope.getAccessibleCompanyIds()));
        Long selected=com.example.demo.common.context.CompanyContext.get();
        if(selected!=null)spec=spec.and((root,query,cb)->cb.equal(root.get("department").get("company").get("id"),selected));
        return departmentManagerRepository.findAll(spec).stream().map(this::departmentManagerView).toList();
    }

    @Transactional(readOnly=true)
    public Map<String,Object> departmentManagerOptions(Long companyId,String search) {
        com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(companyId);
        var company=companyRepository.findById(companyId).orElseThrow(()->new ResourceNotFoundException("Company",companyId));
        if(!company.isActive())throw new com.example.demo.common.exception.BadRequestException("Select an active company");
        var departments=departmentRepository.findByCompanyIdAndIsActiveTrue(companyId).stream().map(d->Map.of("id",d.getId(),"name",d.getName())).toList();
        String term="%"+search.strip().toLowerCase(java.util.Locale.ROOT)+"%";
        Specification<com.example.demo.employee.entity.Employee> spec=(root,query,cb)->cb.and(cb.equal(root.get("company").get("id"),companyId),cb.isTrue(root.get("isActive")),cb.or(cb.like(cb.lower(root.get("firstName")),term),cb.like(cb.lower(root.get("lastName")),term),cb.like(cb.lower(root.get("email")),term),cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName")," "),root.get("lastName"))),term)));
        var employees=employeeRepository.findAll(spec,org.springframework.data.domain.PageRequest.of(0,50,org.springframework.data.domain.Sort.by("firstName","id")));
        var choices=employees.getContent().stream().map(e->{Map<String,Object> m=new LinkedHashMap<>();m.put("id",e.getId());m.put("name",java.util.stream.Stream.of(e.getFirstName(),e.getLastName()).filter(java.util.Objects::nonNull).collect(Collectors.joining(" ")).strip());m.put("email",e.getEmail());return m;}).toList();
        return Map.of("departments",departments,"employees",choices,"employeeTotal",employees.getTotalElements());
    }

    @Transactional
    public Map<String,Object> assignDepartmentManager(DepartmentManager dm) {
        if(dm.getId()!=null || dm.getDepartment()==null || dm.getDepartment().getId()==null || dm.getManager()==null || dm.getManager().getId()==null)throw new com.example.demo.common.exception.BadRequestException("Select a department and an employee");
        final Long departmentId=dm.getDepartment().getId(); final Long managerId=dm.getManager().getId();
        var department=departmentRepository.lockById(departmentId).orElseThrow(()->new ResourceNotFoundException("Department",departmentId));
        requireDepartmentAccess(department);
        var employee=employeeRepository.findById(managerId).orElseThrow(()->new ResourceNotFoundException("Employee",managerId));
        if(!department.isActive() || !employee.isActive() || !department.getCompany().isActive())throw new com.example.demo.common.exception.BadRequestException("Select an active department and employee");
        if(employee.getCompany()==null || !department.getCompany().getId().equals(employee.getCompany().getId()))throw new com.example.demo.common.exception.BadRequestException("The employee and department must belong to the same company");
        var existing=departmentManagerRepository.findByDepartmentId(department.getId()).stream().filter(a->a.getManager().getId().equals(employee.getId())).findFirst().orElse(null);
        if(existing!=null)dm=existing;
        dm.setDepartment(department);dm.setManager(employee);dm.setCompany(department.getCompany());dm.setActive(true);
        return departmentManagerView(departmentManagerRepository.save(dm));
    }

    @Transactional
    public void removeDepartmentManager(Long id) {
        var assignment=departmentManagerRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("Department manager",id));
        requireDepartmentAccess(assignment.getDepartment());assignment.setActive(false);departmentManagerRepository.save(assignment);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private Ticket findTicket(Long id) {
        var ticket=ticketRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("Ticket",id));
        com.example.demo.base.service.StandardCompanySetup.requireCompanyAccess(ticket.getCompany().getId());
        var scope=AccessScopeContext.get();
        if(scope!=null && scope.isSelfScope() && !assignedToCurrentUser(ticket)
            && (ticket.getRaisedBy()==null || ticket.getRaisedBy().getUser()==null
                || !scope.getUserId().equals(ticket.getRaisedBy().getUser().getId())))
            throw new org.springframework.security.access.AccessDeniedException("Ticket is outside your access");
        return ticket;
    }
}
