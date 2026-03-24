package com.example.demo.base.controller;

import com.example.demo.base.entity.MailAutomation;
import com.example.demo.base.repository.MailAutomationRepository;
import com.example.demo.base.repository.MailTemplateRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
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
@RequestMapping("/api/mail-automations")
@RequiredArgsConstructor
@Tag(name = "Mail Automations")
public class MailAutomationController {

    private final MailAutomationRepository repository;
    private final MailTemplateRepository mailTemplateRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all mail automations")
    public ResponseEntity<List<MailAutomation>> list() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List active mail automations")
    public ResponseEntity<List<MailAutomation>> listActive() {
        return ResponseEntity.ok(repository.findByIsActiveTrue());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a mail automation rule")
    public ResponseEntity<MailAutomation> create(@RequestBody MailAutomation automation) {
        if (automation.getMailTemplate() != null && automation.getMailTemplate().getId() != null) {
            automation.setMailTemplate(mailTemplateRepository.getReferenceById(automation.getMailTemplate().getId()));
        }
        return ResponseEntity.ok(repository.save(automation));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a mail automation rule")
    public ResponseEntity<MailAutomation> update(@PathVariable Long id, @RequestBody MailAutomation updated) {
        MailAutomation a = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailAutomation", id));
        a.setTitle(updated.getTitle());
        a.setModel(updated.getModel());
        a.setTrigger(updated.getTrigger());
        a.setMailTo(updated.getMailTo());
        a.setMailDetails(updated.getMailDetails());
        a.setDeliveryChannel(updated.getDeliveryChannel());
        a.setConditionQuerystring(updated.getConditionQuerystring());
        a.setIsActive(updated.getIsActive());
        if (updated.getMailTemplate() != null && updated.getMailTemplate().getId() != null) {
            a.setMailTemplate(mailTemplateRepository.getReferenceById(updated.getMailTemplate().getId()));
        }
        return ResponseEntity.ok(repository.save(a));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Toggle active status of a mail automation")
    public ResponseEntity<MailAutomation> toggle(@PathVariable Long id) {
        MailAutomation a = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailAutomation", id));
        a.setIsActive(!Boolean.TRUE.equals(a.getIsActive()));
        return ResponseEntity.ok(repository.save(a));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a mail automation")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Mail automation deleted"));
    }
}
