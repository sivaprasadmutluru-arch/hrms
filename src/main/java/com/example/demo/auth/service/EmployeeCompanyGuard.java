package com.example.demo.auth.service;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;
import java.time.LocalDate;

/** Explicit schema queries avoid changing a transaction's already-bound tenant connection. */
@Service
@RequiredArgsConstructor
public class EmployeeCompanyGuard {
    private final JdbcTemplate jdbc;
    private final UserRoleRepository roles;

    public Set<Long> linkedCompanies(Long userId) {
        Set<Long> result = new HashSet<>();
        // Do not let a retired tenant, or a legacy tenant schema predating the
        // employee/company association, block authentication for every user.
        for (String schema : jdbc.queryForList("SELECT DISTINCT schema_name FROM public.companies WHERE is_active = true AND schema_name IS NOT NULL AND schema_name <> ''", String.class)) {
            if (!schema.matches("[a-zA-Z_][a-zA-Z0-9_]*")) throw new BadRequestException("Invalid company schema configuration");
            Integer requiredColumns = jdbc.queryForObject(
                    "SELECT count(*) FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name IN ('user_id', 'company_id')",
                    Integer.class, schema);
            if (requiredColumns == null || requiredColumns != 2) {
                // A legacy schema is not a valid source for current account links.
                // Its data remains untouched and is handled by the schema migration path.
                continue;
            }
            result.addAll(jdbc.queryForList("SELECT company_id FROM \"" + schema + "\".employees WHERE user_id = ? AND is_active = true", Long.class, userId));
        }
        return result;
    }

    public void validateEmployment(Long userId, Long companyId) {
        // Serialize competing assignments for the same account; caller must be transactional.
        jdbc.queryForList("SELECT id FROM public.users WHERE id = ? FOR UPDATE", Long.class, userId);
        Set<Long> companies = linkedCompanies(userId);
        companies.addAll(jdbc.queryForList("SELECT ur.company_id FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.name='EMPLOYEE' AND ur.company_id IS NOT NULL", Long.class, userId));
        Long organization = organization(companyId);
        for (Long existing : companies) {
            if (!existing.equals(companyId) && (organization == null || !organization.equals(organization(existing)))) {
                throw new BadRequestException("This account belongs to another organization. Use the existing employee account in its organization; company transfers require a separate reviewed process.");
            }
        }
    }

    private Long organization(Long companyId) {
        return jdbc.queryForObject("SELECT organization_id FROM public.companies WHERE id=?", Long.class, companyId);
    }

    public UserRole primaryRole(Long userId) {
        Set<Long> linked = linkedCompanies(userId);
        // A login must never be anchored to a revoked, expired, or not-yet-effective
        // assignment.  Besides presenting the wrong company in the UI, that used to
        // select the wrong tenant schema and consequently hide company-scoped data
        // such as leave types for newly created employees.
        return roles.findByUserId(userId).stream()
            .filter(r -> r.getCompany() != null && r.isEffectiveOn(LocalDate.now()))
            .sorted(Comparator.<UserRole>comparingInt(r -> r.getAccessScope()==null ? -1 : r.getAccessScope().ordinal()).reversed()
                .thenComparing(r -> !linked.contains(r.getCompany().getId()))
                .thenComparing(r -> r.getCompany().getId())
                .thenComparing(r -> r.getId()))
            .findFirst().orElse(null);
    }
}
