package com.example.demo.recruitment.controller;

import com.example.demo.recruitment.entity.LinkedInAccount;
import com.example.demo.recruitment.repository.LinkedInAccountRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/linkedin")
@RequiredArgsConstructor
@Tag(name = "LinkedIn Integration")
public class LinkedInController {

    private final LinkedInAccountRepository linkedInAccountRepository;

    @PostMapping("/setup")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Operation(summary = "Save LinkedIn account settings")
    public ResponseEntity<LinkedInAccount> saveLinkedInAccount(@RequestBody LinkedInAccount account) {
        return ResponseEntity.ok(linkedInAccountRepository.save(account));
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Operation(summary = "Validate LinkedIn credentials (stub)")
    public ResponseEntity<Map<String, Object>> validateCredentials(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("valid", true, "status", "connected"));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Operation(summary = "Sync candidates from LinkedIn (stub)")
    public ResponseEntity<Map<String, Object>> syncCandidates(@RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(Map.of("synced", 0, "message", "LinkedIn sync completed"));
    }
}
