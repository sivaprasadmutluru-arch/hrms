package com.example.demo.onboarding.controller;

import com.example.demo.onboarding.service.ProbationConfirmationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController @RequestMapping("/api/onboarding/probation") @RequiredArgsConstructor
public class ProbationController {
    private final ProbationConfirmationService service;
    public record PolicyRequest(boolean enabled, LocalDate effectiveFrom) {}

    @GetMapping("/{companyId}/policy")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public ProbationConfirmationService.PolicyView policy(@PathVariable Long companyId) { return service.policy(companyId); }

    @PutMapping("/{companyId}/policy")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','SUPER_ADMIN','COMPANY_ADMIN','ENTERPRISE_ADMIN','HR_MANAGER') and hasAuthority('onboarding:edit')")
    public ProbationConfirmationService.PolicyView save(@PathVariable Long companyId, @RequestBody PolicyRequest request) {
        return service.savePolicy(companyId, request.enabled(), request.effectiveFrom());
    }

    @GetMapping("/{companyId}/employees")
    @PreAuthorize("hasAuthority('onboarding:view')")
    public List<ProbationConfirmationService.EmployeeView> employees(@PathVariable Long companyId) {
        return service.list(companyId, LocalDate.now(ZoneId.of("Asia/Dubai")));
    }
}
