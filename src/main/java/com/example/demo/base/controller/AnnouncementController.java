package com.example.demo.base.controller;

import com.example.demo.base.entity.Announcement;
import com.example.demo.base.entity.AnnouncementComment;
import com.example.demo.base.repository.AnnouncementCommentRepository;
import com.example.demo.base.repository.AnnouncementRepository;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
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
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
@Tag(name = "Announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementCommentRepository commentRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('announcements:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List announcements (company-scoped)")
    public ResponseEntity<List<Announcement>> list() {
        var spec = ScopeFilter.<Announcement>byCompany();
        return ResponseEntity.ok(spec != null ? announcementRepository.findAll(spec) : announcementRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an announcement")
    public ResponseEntity<Announcement> create(@RequestBody Announcement announcement) {
        if (announcement.getCompany() != null && announcement.getCompany().getId() != null) {
            announcement.setCompany(companyRepository.getReferenceById(announcement.getCompany().getId()));
        }
        if (announcement.getCreatedBy() != null && announcement.getCreatedBy().getId() != null) {
            announcement.setCreatedBy(employeeRepository.getReferenceById(announcement.getCreatedBy().getId()));
        }
        return ResponseEntity.ok(announcementRepository.save(announcement));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an announcement")
    public ResponseEntity<Announcement> update(@PathVariable Long id, @RequestBody Announcement updated) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement", id));
        a.setTitle(updated.getTitle());
        a.setDescription(updated.getDescription());
        a.setExpiresOn(updated.getExpiresOn());
        return ResponseEntity.ok(announcementRepository.save(a));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an announcement")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        announcementRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted"));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('announcements:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List comments for an announcement")
    public ResponseEntity<List<AnnouncementComment>> listComments(@PathVariable Long id) {
        return ResponseEntity.ok(commentRepository.findByAnnouncementId(id));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAuthority('announcements:view')")
    @Transactional
    @Operation(summary = "Add a comment to an announcement")
    public ResponseEntity<AnnouncementComment> addComment(@PathVariable Long id, @RequestBody AnnouncementComment comment) {
        comment.setAnnouncement(announcementRepository.getReferenceById(id));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(commentRepository.save(comment));
    }
}
