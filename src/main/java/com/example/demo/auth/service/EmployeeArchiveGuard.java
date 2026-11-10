package com.example.demo.auth.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EmployeeArchiveGuard {
    private final JdbcTemplate jdbc;

    /** Tenant employee records remain the source of truth; no cached login status. */
    public boolean isArchived(User user) {
        if (UserPrincipal.hasEffectivePlatformSuperAdminRole(user)) return false;
        var schemas = new TreeSet<String>();
        for (var assignment : user.getUserRoles()) {
            if (assignment.getCompany() == null) continue;
            String schema = assignment.getCompany().getSchemaName();
            if (schema != null && schema.matches("[a-zA-Z_][a-zA-Z0-9_]*")) schemas.add(schema);
        }
        if (schemas.isEmpty()) return false; // Non-employee platform/service accounts have no employment status.
        String placeholders = String.join(",", Collections.nCopies(schemas.size(), "?"));
        var available = jdbc.queryForList("SELECT table_schema FROM information_schema.columns WHERE table_schema IN (" + placeholders
                + ") AND table_name='employees' AND column_name IN ('user_id','is_active') GROUP BY table_schema HAVING count(*)=2", String.class, schemas.toArray());
        for (String schema : available) {
            if (!schemas.contains(schema)) continue;
            Boolean archived = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM \"" + schema + "\".employees WHERE user_id=? AND is_active=false)", Boolean.class, user.getId());
            if (Boolean.TRUE.equals(archived)) return true;
        }
        return false;
    }
}
