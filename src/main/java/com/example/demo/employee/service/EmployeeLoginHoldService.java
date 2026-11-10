package com.example.demo.employee.service;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.audit.entity.AuditLog;
import com.example.demo.base.service.StandardCompanySetup;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmployeeLoginHoldService {
    private final EmployeeRepository employees;
    private final UserRepository users;
    private final AuditLogRepository audit;
    private final ObjectMapper json;

    @Transactional
    public Map<String,Object> setHold(Long id, Long companyId, boolean held, String reason) {
        StandardCompanySetup.requireCompanyAccess(companyId);
        if (reason == null || reason.isBlank() || reason.trim().length() > 500)
            throw new BadRequestException("Enter a reason (up to 500 characters)");
        var employee = employees.findById(id).orElseThrow(() -> new ResourceNotFoundException("Employee", id));
        if (employee.getCompany() == null || !companyId.equals(employee.getCompany().getId()))
            throw new AccessDeniedException("Employee is outside the selected company");
        if (employee.getUser() == null) throw new BadRequestException("This employee has no login account");
        var account = users.findByIdForUpdate(employee.getUser().getId()).orElseThrow();
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal actor)) throw new AccessDeniedException("Sign in again");
        if (account.getId().equals(actor.getId())) throw new BadRequestException("You cannot hold or resume your own login");
        if (UserPrincipal.hasEffectivePlatformSuperAdminRole(account)) throw new BadRequestException("Platform administrator logins cannot be held here");
        boolean platform = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));
        // Account-level holds affect every company. Require authority over every effective assignment.
        if (!platform) for (var grant : account.getUserRoles()) {
            if (!grant.isEffectiveOn(LocalDate.now())) continue;
            if (grant.getCompany() == null) throw new AccessDeniedException("This account has access outside your company scope");
            StandardCompanySetup.requireCompanyAccess(grant.getCompany().getId());
            String role = grant.getRole().getName().name();
            if (java.util.Set.of("SUPER_ADMIN", "ACCOUNT_MANAGER", "COMPANY_ADMIN", "ENTERPRISE_ADMIN", "BRANCH_ADMIN", "HR_MANAGER", "CEO").contains(role))
                throw new AccessDeniedException("A platform administrator must manage this administrator login");
        }
        boolean before = account.isLoginHeld();
        if (before != held) {
            account.setLoginHeld(held);
            users.save(account);
            var entry = new AuditLog();
            entry.setEntityType("EmployeeLogin"); entry.setEntityId(id.toString()); entry.setCompany(employee.getCompany());
            entry.setAction(held ? "LOGIN_HELD" : "LOGIN_RESUMED"); entry.setChangedBy(auth.getName());
            try {
                entry.setOldValues(json.writeValueAsString(Map.of("loginHeld",before)));
                entry.setNewValues(json.writeValueAsString(Map.of("loginHeld",held,"reason",reason.trim(),"userId",account.getId(),"companyId",companyId)));
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
            audit.save(entry);
        }
        return Map.of("loginHeld",held,"message",held ? "Employee login held" : "Login hold removed; other access restrictions still apply");
    }
}
