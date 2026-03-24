package com.example.demo.helpdesk.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.helpdesk.entity.*;
import com.example.demo.helpdesk.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/helpdesk")
@RequiredArgsConstructor
@Tag(name = "Helpdesk Extras")
public class HelpdeskExtrasController {

    private final ClaimRequestRepository claimRequestRepository;
    private final FAQCategoryRepository faqCategoryRepository;
    private final FAQRepository faqRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentManagerRepository departmentManagerRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final com.example.demo.helpdesk.repository.TicketRepository ticketRepository;
    private final com.example.demo.base.repository.DepartmentRepository departmentRepository;

    // ─── Claims ───────────────────────────────────────────────────────────────

    @GetMapping("/claims")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List claim requests (company-scoped)")
    public ResponseEntity<List<ClaimRequest>> listClaims() {
        var spec = ScopeFilter.<ClaimRequest>byEmployee();
        return ResponseEntity.ok(spec != null ? claimRequestRepository.findAll(spec) : claimRequestRepository.findAll());
    }

    @PostMapping("/claims")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Transactional
    @Operation(summary = "Submit a claim request")
    public ResponseEntity<ClaimRequest> createClaim(@RequestBody ClaimRequest claim) {
        if (claim.getEmployee() != null && claim.getEmployee().getId() != null) {
            claim.setEmployee(employeeRepository.getReferenceById(claim.getEmployee().getId()));
        }
        if (claim.getCompany() != null && claim.getCompany().getId() != null) {
            claim.setCompany(companyRepository.getReferenceById(claim.getCompany().getId()));
        }
        return ResponseEntity.ok(claimRequestRepository.save(claim));
    }

    @PostMapping("/claims/{id}/approve")
    @PreAuthorize("hasAuthority('helpdesk:approve')")
    @Transactional
    @Operation(summary = "Approve a claim request")
    public ResponseEntity<ClaimRequest> approveClaim(@PathVariable Long id) {
        ClaimRequest c = claimRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClaimRequest", id));
        c.setIsApproved(true);
        c.setIsRejected(false);
        return ResponseEntity.ok(claimRequestRepository.save(c));
    }

    @PostMapping("/claims/{id}/reject")
    @PreAuthorize("hasAuthority('helpdesk:approve')")
    @Transactional
    @Operation(summary = "Reject a claim request")
    public ResponseEntity<ClaimRequest> rejectClaim(@PathVariable Long id) {
        ClaimRequest c = claimRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClaimRequest", id));
        c.setIsRejected(true);
        c.setIsApproved(false);
        return ResponseEntity.ok(claimRequestRepository.save(c));
    }

    // ─── FAQ Categories ───────────────────────────────────────────────────────

    @GetMapping("/faq-categories")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List FAQ categories (company-scoped)")
    public ResponseEntity<List<FAQCategory>> listFAQCategories() {
        var spec = ScopeFilter.<FAQCategory>byCompany();
        return ResponseEntity.ok(spec != null ? faqCategoryRepository.findAll(spec) : faqCategoryRepository.findAll());
    }

    @PostMapping("/faq-categories")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a FAQ category")
    public ResponseEntity<FAQCategory> createFAQCategory(@RequestBody FAQCategory category) {
        if (category.getCompany() != null && category.getCompany().getId() != null) {
            category.setCompany(companyRepository.getReferenceById(category.getCompany().getId()));
        }
        return ResponseEntity.ok(faqCategoryRepository.save(category));
    }

    @PutMapping("/faq-categories/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a FAQ category")
    public ResponseEntity<FAQCategory> updateFAQCategory(@PathVariable Long id, @RequestBody FAQCategory updated) {
        FAQCategory c = faqCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQCategory", id));
        c.setTitle(updated.getTitle());
        c.setDescription(updated.getDescription());
        return ResponseEntity.ok(faqCategoryRepository.save(c));
    }

    @DeleteMapping("/faq-categories/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a FAQ category")
    public ResponseEntity<Map<String, String>> deleteFAQCategory(@PathVariable Long id) {
        faqCategoryRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "FAQ category deleted"));
    }

    // ─── FAQs ─────────────────────────────────────────────────────────────────

    @GetMapping("/faqs")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List FAQs (optionally by category)")
    public ResponseEntity<List<FAQ>> listFAQs(@RequestParam(required = false) Long categoryId) {
        if (categoryId != null) return ResponseEntity.ok(faqRepository.findByCategoryId(categoryId));
        var spec = ScopeFilter.<FAQ>byCompany();
        return ResponseEntity.ok(spec != null ? faqRepository.findAll(spec) : faqRepository.findAll());
    }

    @PostMapping("/faqs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a FAQ")
    public ResponseEntity<FAQ> createFAQ(@RequestBody FAQ faq) {
        if (faq.getCategory() != null && faq.getCategory().getId() != null) {
            faq.setCategory(faqCategoryRepository.getReferenceById(faq.getCategory().getId()));
        }
        if (faq.getCompany() != null && faq.getCompany().getId() != null) {
            faq.setCompany(companyRepository.getReferenceById(faq.getCompany().getId()));
        }
        return ResponseEntity.ok(faqRepository.save(faq));
    }

    @PutMapping("/faqs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a FAQ")
    public ResponseEntity<FAQ> updateFAQ(@PathVariable Long id, @RequestBody FAQ updated) {
        FAQ faq = faqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FAQ", id));
        faq.setQuestion(updated.getQuestion());
        faq.setAnswer(updated.getAnswer());
        return ResponseEntity.ok(faqRepository.save(faq));
    }

    @DeleteMapping("/faqs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a FAQ")
    public ResponseEntity<Map<String, String>> deleteFAQ(@PathVariable Long id) {
        faqRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "FAQ deleted"));
    }

    // ─── Department Managers ──────────────────────────────────────────────────

    @GetMapping("/department-managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List helpdesk department managers (company-scoped)")
    public ResponseEntity<List<DepartmentManager>> listDepartmentManagers(@RequestParam(required = false) Long departmentId) {
        if (departmentId != null) return ResponseEntity.ok(departmentManagerRepository.findByDepartmentId(departmentId));
        var spec = ScopeFilter.<DepartmentManager>byCompany();
        return ResponseEntity.ok(spec != null ? departmentManagerRepository.findAll(spec) : departmentManagerRepository.findAll());
    }

    @PostMapping("/department-managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Assign a manager to a department for helpdesk")
    public ResponseEntity<DepartmentManager> assignDepartmentManager(@RequestBody DepartmentManager dm) {
        if (dm.getDepartment() != null && dm.getDepartment().getId() != null) {
            dm.setDepartment(departmentRepository.getReferenceById(dm.getDepartment().getId()));
        }
        if (dm.getManager() != null && dm.getManager().getId() != null) {
            dm.setManager(employeeRepository.getReferenceById(dm.getManager().getId()));
        }
        if (dm.getCompany() != null && dm.getCompany().getId() != null) {
            dm.setCompany(companyRepository.getReferenceById(dm.getCompany().getId()));
        }
        return ResponseEntity.ok(departmentManagerRepository.save(dm));
    }

    @DeleteMapping("/department-managers/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Remove a department manager assignment")
    public ResponseEntity<Void> removeDepartmentManager(@PathVariable Long id) {
        departmentManagerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Ticket Attachments ───────────────────────────────────────────────────

    @GetMapping("/tickets/{ticketId}/attachments")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List attachments for a ticket")
    public ResponseEntity<List<TicketAttachment>> listTicketAttachments(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ticketAttachmentRepository.findByTicketId(ticketId));
    }

    @PostMapping("/tickets/{ticketId}/attachments")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Transactional
    @Operation(summary = "Attach a file to a ticket")
    public ResponseEntity<TicketAttachment> addTicketAttachment(@PathVariable Long ticketId,
                                                                 @RequestBody TicketAttachment attachment) {
        attachment.setTicket(ticketRepository.getReferenceById(ticketId));
        return ResponseEntity.ok(ticketAttachmentRepository.save(attachment));
    }

    @DeleteMapping("/ticket-attachments/{id}")
    @PreAuthorize("hasAuthority('helpdesk:delete')")
    @Operation(summary = "Delete a ticket attachment")
    public ResponseEntity<Void> deleteTicketAttachment(@PathVariable Long id) {
        ticketAttachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
