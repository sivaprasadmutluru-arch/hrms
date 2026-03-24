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
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
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
        // Platform Super Admin may have a company assigned (Prabha Tech HO); if still null,
        // fall back to the first available Head Office so the tenant schema is always set.
        Long companyId = userRoleRepository.findByUserId(principal.getId()).stream()
                .filter(ur -> ur.getCompany() != null)
                .max(java.util.Comparator.comparingInt(ur ->
                        ur.getAccessScope() != null ? ur.getAccessScope().ordinal() : -1))
                .map(ur -> ur.getCompany().getId())
                .orElseGet(() -> companyRepository
                        .findAll().stream()
                        .filter(Company::isHeadOffice)
                        .map(Company::getId)
                        .findFirst()
                        .orElse(null));

        Long employeeId = employeeRepository.findByUserId(principal.getId())
                .map(e -> e.getId())
                .orElse(null);

        return new LoginResponse(token, principal.getId(), principal.getUsername(), principal.getEmail(), roles, companyId, employeeId);
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
}
