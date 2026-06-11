package com.example.demo.audit;

import com.example.demo.audit.entity.AccountBlockUnblock;
import com.example.demo.audit.entity.AuditLog;
import com.example.demo.audit.repository.AccountBlockUnblockRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit Logs")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final AccountBlockUnblockRepository accountBlockUnblockRepository;

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "List audit logs (paginated, optionally filtered by entity type)")
    public ResponseEntity<Page<AuditLog>> listLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("changedAt").descending());
        if (entityType != null && !entityType.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findByEntityType(entityType, pageable));
        }
        return ResponseEntity.ok(auditLogRepository.findAll(pageable));
    }

    // ─── Account Block/Unblock Feature Toggle ────────────────────────────────

    @GetMapping("/account-block-feature")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get whether the account block/unblock feature is enabled")
    public ResponseEntity<Map<String, Object>> getAccountBlockFeature() {
        AccountBlockUnblock setting = accountBlockUnblockRepository.findAll().stream()
                .findFirst().orElse(null);
        boolean enabled = setting != null && setting.isEnabled();
        return ResponseEntity.ok(Map.of("isEnabled", enabled));
    }

    @PostMapping("/account-block-feature/toggle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Operation(summary = "Toggle the account block/unblock feature on or off")
    public ResponseEntity<Map<String, Object>> toggleAccountBlockFeature() {
        AccountBlockUnblock setting = accountBlockUnblockRepository.findAll().stream()
                .findFirst()
                .orElseGet(AccountBlockUnblock::new);
        setting.setEnabled(!setting.isEnabled());
        accountBlockUnblockRepository.save(setting);
        return ResponseEntity.ok(Map.<String, Object>of("isEnabled", setting.isEnabled(),
                "message", "Account block/unblock feature " + (setting.isEnabled() ? "enabled" : "disabled")));
    }
}
