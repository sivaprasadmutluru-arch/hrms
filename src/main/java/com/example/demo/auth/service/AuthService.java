package com.example.demo.auth.service;

import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.LoginResponse;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.JwtTokenProvider;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public LoginResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword()));
        String token = jwtTokenProvider.generateToken(auth);
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        userRepository.findById(principal.getId()).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            userRepository.save(u);
        });
        List<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        // Resolve the user's primary company ID — prefer the highest-scope role's company
        // so ENTERPRISE_ADMIN gets their head office ID, not a random branch.
        Long companyId = userRoleRepository.findByUserId(principal.getId()).stream()
                .filter(ur -> ur.getCompany() != null)
                .max(java.util.Comparator.comparingInt(ur ->
                        ur.getAccessScope() != null ? ur.getAccessScope().ordinal() : -1))
                .map(ur -> ur.getCompany().getId())
                .orElse(null);

        // Employee rows live inside each company's own tenant schema, so the lookup
        // must switch TenantContext to that schema first — querying without doing so
        // (the previous behaviour) silently misses real data and always returns null.
        Long employeeId = null;
        if (companyId != null) {
            String schema = companyRepository.findById(companyId).map(Company::getSchemaName).orElse(null);
            Employee emp = findEmployeeInTenant(principal.getId(), schema);
            if (emp != null) employeeId = emp.getId();
        } else {
            // No role-scoped company — typically Platform Super Admin. Rather than
            // guessing "first head office" (previously non-deterministic: findAll()
            // has no defined order, so the same admin could land in a different
            // tenant on every login), search every active head office's tenant schema
            // for a linked Employee record. If the admin has one, that company is the
            // unambiguous correct choice; sorting by ID keeps the no-employee fallback
            // deterministic too.
            List<Company> headOffices = companyRepository.findAllHeadOfficesActivePublic().stream()
                    .sorted(java.util.Comparator.comparing(Company::getId))
                    .collect(java.util.stream.Collectors.toList());
            for (Company ho : headOffices) {
                Employee emp = findEmployeeInTenant(principal.getId(), ho.getSchemaName());
                if (emp != null) {
                    companyId = ho.getId();
                    employeeId = emp.getId();
                    break;
                }
            }
            if (companyId == null && !headOffices.isEmpty()) {
                companyId = headOffices.get(0).getId();
            }
        }

        // Block login if the user's organization is suspended (Platform Super Admin is exempt)
        if (companyId != null && !roles.contains("PLATFORM_SUPER_ADMIN")) {
            companyRepository.findOrgStatusByCompanyId(companyId).ifPresent(orgStatus -> {
                if (Organization.OrgStatus.SUSPENDED.equals(orgStatus)) {
                    throw new BadRequestException("ORGANIZATION_SUSPENDED");
                }
            });
        }

        String companyName = companyId != null
                ? companyRepository.findById(companyId).map(Company::getName).orElse(null)
                : null;

        return new LoginResponse(token, principal.getId(), principal.getUsername(), principal.getEmail(), roles, companyId, companyName, employeeId);
    }

    /** Looks up a linked Employee by userId inside a specific tenant schema, restoring the
     *  previous TenantContext afterward. Returns null for a blank schema or no match. */
    private Employee findEmployeeInTenant(Long userId, String schema) {
        if (schema == null || schema.isBlank()) return null;
        try {
            TenantContext.setTenant(schema);
            return employeeRepository.findByUserId(userId).orElse(null);
        } catch (Exception e) {
            log.warn("Employee lookup failed for schema='{}': {}", schema, e.getMessage());
            return null;
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already in use");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user = userRepository.save(user);

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId()).orElse(null);
            Role employeeRole = roleRepository.findByName(Role.RoleName.EMPLOYEE)
                    .orElseThrow(() -> new BadRequestException("EMPLOYEE role not found — ensure DataSeeder has run"));
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(employeeRole);
            userRole.setCompany(company);
            userRole.setAccessScope(UserRole.AccessScope.SELF); // New employees get self-only access by default
            userRoleRepository.save(userRole);
        }

        return user;
    }

    @Transactional
    public String generatePasswordResetToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No user found with email: " + email));
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);
        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid or expired token"));
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token has expired");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    @Transactional
    public void changeUsername(Long userId, String newUsername) {
        if (userRepository.existsByUsername(newUsername)) {
            throw new BadRequestException("Username already taken");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setUsername(newUsername);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void adminResetPassword(Long targetUserId, String newPassword) {
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetUserId));

        // Non-platform-super-admin must only reset users within their accessible companies
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && !scope.hasUnrestrictedAccess()) {
            List<Long> targetCompanyIds = userRoleRepository.findByUserId(targetUserId).stream()
                    .map(ur -> ur.getCompany().getId())
                    .collect(java.util.stream.Collectors.toList());
            boolean hasAccess = targetCompanyIds.stream()
                    .anyMatch(cid -> scope.getAccessibleCompanyIds().contains(cid));
            if (!hasAccess) {
                throw new BadRequestException("You do not have permission to reset this user's password");
            }
        }

        target.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(target);
    }
}
