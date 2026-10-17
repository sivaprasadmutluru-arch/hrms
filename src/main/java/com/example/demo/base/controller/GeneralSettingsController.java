package com.example.demo.base.controller;

import com.example.demo.audit.AuditTagRepository;
import com.example.demo.audit.entity.AuditTag;
import com.example.demo.audit.entity.HistoryTrackingFields;
import com.example.demo.audit.repository.HistoryTrackingFieldsRepository;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.helpdesk.entity.HelpdeskTag;
import com.example.demo.helpdesk.repository.HelpdeskTagRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * General settings endpoints for company-level configuration:
 * - Date/time formats
 * - Dashboard component toggles
 * - White-label branding
 * - Email server test + replace primary
 * - History tracking fields configuration
 * - Helpdesk tags
 * - Audit tags
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "General Settings")
public class GeneralSettingsController {

    private static final List<String> MODULE_KEYS = List.of("payslips", "loans", "reimbursements");

    private final CompanyDateTimeFormatRepository dateTimeFormatRepository;
    private final DashboardComponentSettingRepository dashboardComponentSettingRepository;
    private final WhiteLabelSettingRepository whiteLabelSettingRepository;
    private final DynamicEmailConfigRepository emailConfigRepository;
    private final HistoryTrackingFieldsRepository historyTrackingFieldsRepository;
    private final HelpdeskTagRepository helpdeskTagRepository;
    private final AuditTagRepository auditTagRepository;
    private final CompanyRepository companyRepository;

    @GetMapping("/module-visibility")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get company module visibility; modules are enabled by default")
    public ResponseEntity<Map<String, Boolean>> getModuleVisibility(@RequestParam Long companyId) {
        Map<String, Boolean> visibility = new java.util.LinkedHashMap<>();
        MODULE_KEYS.forEach(key -> visibility.put(key, true));
        dashboardComponentSettingRepository.findByCompanyId(companyId).stream()
                .filter(setting -> setting.getComponentKey() != null && setting.getComponentKey().startsWith("module:"))
                .forEach(setting -> visibility.put(setting.getComponentKey().substring("module:".length()), setting.isEnabled()));
        return ResponseEntity.ok(visibility);
    }

    @PostMapping("/module-visibility")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Save company module visibility")
    public ResponseEntity<Map<String, Boolean>> saveModuleVisibility(
            @RequestParam Long companyId, @RequestBody Map<String, Boolean> visibility) {
        MODULE_KEYS.forEach(key -> {
            if (!visibility.containsKey(key)) return;
            DashboardComponentSetting setting = dashboardComponentSettingRepository
                    .findByCompanyIdAndComponentKey(companyId, "module:" + key)
                    .orElseGet(() -> {
                        DashboardComponentSetting created = new DashboardComponentSetting();
                        created.setCompany(companyRepository.getReferenceById(companyId));
                        created.setComponentKey("module:" + key);
                        return created;
                    });
            setting.setEnabled(Boolean.TRUE.equals(visibility.get(key)));
            dashboardComponentSettingRepository.save(setting);
        });
        return getModuleVisibility(companyId);
    }

    // ─── Date / Time Format ───────────────────────────────────────────────────

    @GetMapping("/date-time-format")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get date/time format settings for a company")
    public ResponseEntity<CompanyDateTimeFormat> getDateTimeFormat(@RequestParam Long companyId) {
        return ResponseEntity.ok(dateTimeFormatRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    CompanyDateTimeFormat f = new CompanyDateTimeFormat();
                    f.setDateFormat("yyyy-MM-dd");
                    f.setTimeFormat("HH:mm");
                    return f;
                }));
    }

    @PostMapping("/date-time-format")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Save date/time format settings for a company")
    public ResponseEntity<CompanyDateTimeFormat> saveDateTimeFormat(@RequestParam Long companyId,
                                                                     @RequestBody CompanyDateTimeFormat body) {
        CompanyDateTimeFormat fmt = dateTimeFormatRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    CompanyDateTimeFormat f = new CompanyDateTimeFormat();
                    f.setCompany(companyRepository.getReferenceById(companyId));
                    return f;
                });
        if (body.getDateFormat() != null) fmt.setDateFormat(body.getDateFormat());
        if (body.getTimeFormat() != null) fmt.setTimeFormat(body.getTimeFormat());
        return ResponseEntity.ok(dateTimeFormatRepository.save(fmt));
    }

    // ─── Dashboard Component Toggles ──────────────────────────────────────────

    @GetMapping("/dashboard-components")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all dashboard component toggle settings for a company")
    public ResponseEntity<List<DashboardComponentSetting>> getDashboardComponents(@RequestParam Long companyId) {
        return ResponseEntity.ok(dashboardComponentSettingRepository.findByCompanyId(companyId));
    }

    @PostMapping("/dashboard-components/toggle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Toggle a dashboard component on/off for a company")
    public ResponseEntity<DashboardComponentSetting> toggleDashboardComponent(
            @RequestParam Long companyId,
            @RequestParam String componentKey) {
        DashboardComponentSetting setting = dashboardComponentSettingRepository
                .findByCompanyIdAndComponentKey(companyId, componentKey)
                .orElseGet(() -> {
                    DashboardComponentSetting s = new DashboardComponentSetting();
                    s.setCompany(companyRepository.getReferenceById(companyId));
                    s.setComponentKey(componentKey);
                    s.setEnabled(true); // default enabled
                    return s;
                });
        setting.setEnabled(!setting.isEnabled());
        return ResponseEntity.ok(dashboardComponentSettingRepository.save(setting));
    }

    @PostMapping("/dashboard-components/bulk-update")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Bulk update dashboard component enabled/disabled states")
    public ResponseEntity<List<DashboardComponentSetting>> bulkUpdateDashboardComponents(
            @RequestParam Long companyId,
            @RequestBody List<Map<String, Object>> updates) {
        for (Map<String, Object> update : updates) {
            String key = update.get("componentKey").toString();
            boolean enabled = Boolean.parseBoolean(update.get("enabled").toString());
            DashboardComponentSetting setting = dashboardComponentSettingRepository
                    .findByCompanyIdAndComponentKey(companyId, key)
                    .orElseGet(() -> {
                        DashboardComponentSetting s = new DashboardComponentSetting();
                        s.setCompany(companyRepository.getReferenceById(companyId));
                        s.setComponentKey(key);
                        return s;
                    });
            setting.setEnabled(enabled);
            dashboardComponentSettingRepository.save(setting);
        }
        return ResponseEntity.ok(dashboardComponentSettingRepository.findByCompanyId(companyId));
    }

    // ─── White Labelling ──────────────────────────────────────────────────────

    @GetMapping("/white-label")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get white-label branding settings for a company")
    public ResponseEntity<WhiteLabelSetting> getWhiteLabel(@RequestParam Long companyId) {
        return ResponseEntity.ok(whiteLabelSettingRepository.findByCompanyId(companyId).orElse(null));
    }

    @PostMapping("/white-label")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional
    @Operation(summary = "Create or update white-label branding settings")
    public ResponseEntity<WhiteLabelSetting> saveWhiteLabel(@RequestParam Long companyId,
                                                              @RequestBody WhiteLabelSetting body) {
        WhiteLabelSetting wl = whiteLabelSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    WhiteLabelSetting w = new WhiteLabelSetting();
                    w.setCompany(companyRepository.getReferenceById(companyId));
                    return w;
                });
        if (body.getBrandName() != null) wl.setBrandName(body.getBrandName());
        if (body.getLogoUrl() != null) wl.setLogoUrl(body.getLogoUrl());
        if (body.getFaviconUrl() != null) wl.setFaviconUrl(body.getFaviconUrl());
        if (body.getPrimaryColor() != null) wl.setPrimaryColor(body.getPrimaryColor());
        wl.setEnabled(body.isEnabled());
        return ResponseEntity.ok(whiteLabelSettingRepository.save(wl));
    }

    @PostMapping("/white-label/toggle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional
    @Operation(summary = "Toggle white-label on/off")
    public ResponseEntity<WhiteLabelSetting> toggleWhiteLabel(@RequestParam Long companyId) {
        WhiteLabelSetting wl = whiteLabelSettingRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("WhiteLabelSetting for company", companyId));
        wl.setEnabled(!wl.isEnabled());
        return ResponseEntity.ok(whiteLabelSettingRepository.save(wl));
    }

    // ─── Email Server Test + Replace Primary ─────────────────────────────────

    @PostMapping("/email/test")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Test email server configuration by sending a test email")
    public ResponseEntity<Map<String, Object>> testEmailServer(@RequestParam Long companyId,
                                                                @RequestParam String testEmailTo) {
        var config = emailConfigRepository.findFirstByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("EmailConfig for company", companyId));

        try {
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(config.getHost());
            mailSender.setPort(config.getPort() != null ? config.getPort() : 587);
            mailSender.setUsername(config.getUsername());
            mailSender.setPassword(config.getPassword());

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", Boolean.TRUE.equals(config.getUseTls()) ? "true" : "false");
            props.put("mail.smtp.ssl.enable", Boolean.TRUE.equals(config.getUseSsl()) ? "true" : "false");

            mailSender.testConnection();

            org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
            message.setFrom(config.getFromEmail() != null ? config.getFromEmail() : config.getUsername());
            message.setTo(testEmailTo);
            message.setSubject("Test Email from HRMS");
            message.setText("This is a test email from the HRMS system. If you received this, your email configuration is working correctly.");
            mailSender.send(message);

            return ResponseEntity.ok(Map.<String, Object>of("success", true, "message", "Test email sent to " + testEmailTo));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.<String, Object>of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/email/set-primary")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Set a specific email config as the primary/active one for a company")
    public ResponseEntity<Map<String, String>> setEmailPrimary(@RequestParam Long companyId,
                                                                @RequestParam Long configId) {
        // Deactivate all configs for this company
        var allConfigs = emailConfigRepository.findAllByCompanyId(companyId);
        allConfigs.forEach(c -> {
            c.setIsActive(false);
            emailConfigRepository.save(c);
        });
        // Activate the selected one
        var target = emailConfigRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException("EmailConfig", configId));
        target.setIsActive(true);
        emailConfigRepository.save(target);
        return ResponseEntity.ok(Map.of("message", "Email config " + configId + " is now primary"));
    }

    // ─── History Tracking Fields ──────────────────────────────────────────────

    @GetMapping("/history-tracking")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get history tracking field settings")
    public ResponseEntity<HistoryTrackingFields> getHistoryTracking() {
        return ResponseEntity.ok(historyTrackingFieldsRepository.findAll().stream()
                .findFirst().orElse(null));
    }

    @PostMapping("/history-tracking")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional
    @Operation(summary = "Update history tracking fields configuration")
    public ResponseEntity<HistoryTrackingFields> saveHistoryTracking(@RequestBody HistoryTrackingFields body) {
        HistoryTrackingFields existing = historyTrackingFieldsRepository.findAll().stream()
                .findFirst()
                .orElseGet(HistoryTrackingFields::new);
        if (body.getTrackingFields() != null) existing.setTrackingFields(body.getTrackingFields());
        existing.setWorkInfoTrack(body.isWorkInfoTrack());
        return ResponseEntity.ok(historyTrackingFieldsRepository.save(existing));
    }

    // ─── Helpdesk Tags ────────────────────────────────────────────────────────

    @GetMapping("/helpdesk-tags")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List helpdesk tags for a company")
    public ResponseEntity<List<HelpdeskTag>> listHelpdeskTags(@RequestParam Long companyId) {
        return ResponseEntity.ok(helpdeskTagRepository.findByCompanyId(companyId));
    }

    @PostMapping("/helpdesk-tags")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a helpdesk tag")
    public ResponseEntity<HelpdeskTag> createHelpdeskTag(@RequestParam Long companyId,
                                                          @RequestBody HelpdeskTag tag) {
        tag.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(helpdeskTagRepository.save(tag));
    }

    @PutMapping("/helpdesk-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a helpdesk tag")
    public ResponseEntity<HelpdeskTag> updateHelpdeskTag(@PathVariable Long id, @RequestBody HelpdeskTag updated) {
        HelpdeskTag tag = helpdeskTagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HelpdeskTag", id));
        if (updated.getName() != null) tag.setName(updated.getName());
        if (updated.getColor() != null) tag.setColor(updated.getColor());
        return ResponseEntity.ok(helpdeskTagRepository.save(tag));
    }

    @DeleteMapping("/helpdesk-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a helpdesk tag")
    public ResponseEntity<Map<String, String>> deleteHelpdeskTag(@PathVariable Long id) {
        helpdeskTagRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Helpdesk tag deleted"));
    }

    // ─── Audit Tags ───────────────────────────────────────────────────────────

    @GetMapping("/audit-tags")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "List audit tags for a company")
    public ResponseEntity<List<AuditTag>> listAuditTags(@RequestParam Long companyId) {
        return ResponseEntity.ok(auditTagRepository.findByCompanyId(companyId));
    }

    @PostMapping("/audit-tags")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Create an audit tag")
    public ResponseEntity<AuditTag> createAuditTag(@RequestParam Long companyId, @RequestBody AuditTag tag) {
        tag.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(auditTagRepository.save(tag));
    }

    @PutMapping("/audit-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Update an audit tag")
    public ResponseEntity<AuditTag> updateAuditTag(@PathVariable Long id, @RequestBody AuditTag updated) {
        AuditTag tag = auditTagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AuditTag", id));
        if (updated.getName() != null) tag.setName(updated.getName());
        if (updated.getColor() != null) tag.setColor(updated.getColor());
        return ResponseEntity.ok(auditTagRepository.save(tag));
    }

    @DeleteMapping("/audit-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Delete an audit tag")
    public ResponseEntity<Map<String, String>> deleteAuditTag(@PathVariable Long id) {
        auditTagRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Audit tag deleted"));
    }
}
