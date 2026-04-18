package com.example.demo.employee.service;

import com.example.demo.employee.dto.EmployeeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Queries employees across ALL organization schemas for the Platform Super Admin.
 *
 * Because each Organization is isolated in its own PostgreSQL schema, standard JPA
 * (which operates in a single tenant schema per request) cannot span multiple orgs.
 * This service bypasses the tenant routing layer and uses raw JDBC to build a
 * UNION ALL query that collects employees from every known org schema.
 *
 * Schema names are read from public.companies at query time, so newly onboarded
 * organizations appear automatically — no code changes needed.
 */
@Service
@RequiredArgsConstructor
public class GlobalEmployeeService {

    private final JdbcTemplate jdbcTemplate;

    // Only allow schemas that look like safe identifiers (alphanumeric + underscore)
    private static final Pattern SAFE_SCHEMA = Pattern.compile("^[a-z0-9_]+$");

    private static final String SCHEMA_QUERY =
            "SELECT schema_name FROM public.companies " +
            "WHERE company_type = 'HEAD_OFFICE' AND schema_name IS NOT NULL AND is_active = true";

    /**
     * Returns a paginated list of ALL employees from every organization's schema.
     * Only callable by PLATFORM_SUPER_ADMIN — enforced at the controller layer.
     */
    public Page<EmployeeResponse> getAllAcrossOrgs(Pageable pageable) {
        List<String> schemas = jdbcTemplate.queryForList(SCHEMA_QUERY, String.class)
                .stream()
                .filter(s -> SAFE_SCHEMA.matcher(s).matches())
                .collect(Collectors.toList());

        if (schemas.isEmpty()) {
            return Page.empty(pageable);
        }

        String unionSql = buildUnionSql(schemas);

        // Deduplicate: if the same employee exists in multiple schemas (e.g. data integrity
        // issues in dev), keep only the first occurrence per (company_id, id) pair.
        String dedupedSql =
                "SELECT * FROM (" +
                "  SELECT _u.*, ROW_NUMBER() OVER (PARTITION BY _u.company_id, _u.id ORDER BY _u.created_at) AS _rn" +
                "  FROM (" + unionSql + ") _u" +
                ") _ranked WHERE _rn = 1";

        String countSql = "SELECT COUNT(*) FROM (" + dedupedSql + ") _counted";
        Long total = jdbcTemplate.queryForObject(countSql, Long.class);

        String pagedSql = "SELECT * FROM (" + dedupedSql + ") _all ORDER BY created_at DESC LIMIT ? OFFSET ?";
        List<EmployeeResponse> rows = jdbcTemplate.query(
                pagedSql,
                (rs, rowNum) -> mapRow(rs),
                pageable.getPageSize(),
                pageable.getOffset()
        );

        return new PageImpl<>(rows, pageable, total != null ? total : 0L);
    }

    /**
     * Returns employee IDs that are currently clocked in (check_in NOT NULL, check_out NULL today)
     * across ALL organization schemas. Only callable by PLATFORM_SUPER_ADMIN.
     */
    public Set<Long> getOnlineEmployeeIdsAcrossOrgs() {
        List<String> schemas = jdbcTemplate.queryForList(SCHEMA_QUERY, String.class)
                .stream()
                .filter(s -> SAFE_SCHEMA.matcher(s).matches())
                .collect(Collectors.toList());

        if (schemas.isEmpty()) {
            return Set.of();
        }

        Set<Long> onlineIds = new HashSet<>();
        LocalDate today = LocalDate.now();
        for (String schema : schemas) {
            Integer tableCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = 'attendance'",
                    Integer.class, schema);
            if (tableCount == null || tableCount == 0) continue;
            String sql = "SELECT employee_id FROM " + schema + ".attendance " +
                         "WHERE attendance_date = ? AND check_in IS NOT NULL AND check_out IS NULL";
            List<Long> ids = jdbcTemplate.queryForList(sql, Long.class, today);
            onlineIds.addAll(ids);
        }
        return onlineIds;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String buildUnionSql(List<String> schemas) {
        return schemas.stream()
                .map(this::selectForSchema)
                .collect(Collectors.joining(" UNION ALL "));
    }

    private String selectForSchema(String schema) {
        return "SELECT " +
                "e.id, e.badge_id, e.employee_first_name, e.employee_last_name, " +
                "e.email, e.work_email, e.phone, e.work_phone, e.gender, " +
                "e.date_of_birth, e.marital_status, e.nationality, e.country_of_birth, " +
                "e.place_of_birth, e.permanent_address, e.current_address, " +
                "e.country, e.state, e.city, e.zip, " +
                "e.date_joining, e.employee_type, e.photo_path, e.is_active, e.created_at, " +
                "e.company_id, c.name AS company_name, " +
                "o.name AS organization_name, " +
                "e.department_id, d.name AS department_name, " +
                "e.job_position_id, jp.name AS job_position_name, " +
                "e.job_role_id, jr.name AS job_role_name, " +
                "e.qualification, e.experience, e.children, " +
                "e.emergency_contact, e.emergency_contact_name, e.emergency_contact_relation " +
                "FROM " + schema + ".employees e " +
                "LEFT JOIN public.companies c ON c.id = e.company_id " +
                "LEFT JOIN public.organizations o ON o.id = c.organization_id " +
                "LEFT JOIN " + schema + ".departments d ON d.id = e.department_id " +
                "LEFT JOIN " + schema + ".job_positions jp ON jp.id = e.job_position_id " +
                "LEFT JOIN " + schema + ".job_roles jr ON jr.id = e.job_role_id";
    }

    private EmployeeResponse mapRow(ResultSet rs) throws SQLException {
        EmployeeResponse r = new EmployeeResponse();
        r.setId(rs.getLong("id"));
        r.setBadgeId(rs.getString("badge_id"));
        String fn = rs.getString("employee_first_name");
        String ln = rs.getString("employee_last_name");
        r.setFirstName(fn);
        r.setLastName(ln);
        r.setFullName((fn != null ? fn : "") + (ln != null ? " " + ln : ""));
        r.setEmail(rs.getString("email"));
        r.setWorkEmail(rs.getString("work_email"));
        r.setPhone(rs.getString("phone"));
        r.setWorkPhone(rs.getString("work_phone"));
        r.setGender(rs.getString("gender"));
        java.sql.Date dob = rs.getDate("date_of_birth");
        r.setDateOfBirth(dob != null ? dob.toLocalDate() : null);
        r.setMaritalStatus(rs.getString("marital_status"));
        r.setNationality(rs.getString("nationality"));
        r.setCountryOfBirth(rs.getString("country_of_birth"));
        r.setPlaceOfBirth(rs.getString("place_of_birth"));
        r.setPermanentAddress(rs.getString("permanent_address"));
        r.setCurrentAddress(rs.getString("current_address"));
        r.setCountry(rs.getString("country"));
        r.setState(rs.getString("state"));
        r.setCity(rs.getString("city"));
        r.setZip(rs.getString("zip"));
        java.sql.Date dj = rs.getDate("date_joining");
        r.setDateJoining(dj != null ? dj.toLocalDate() : null);
        r.setEmployeeType(rs.getString("employee_type"));
        r.setPhotoPath(rs.getString("photo_path"));
        r.setActive(rs.getBoolean("is_active"));
        java.sql.Timestamp ca = rs.getTimestamp("created_at");
        r.setCreatedAt(ca != null ? ca.toLocalDateTime() : null);
        if (rs.getObject("company_id") != null) {
            r.setCompanyId(rs.getLong("company_id"));
        }
        r.setCompanyName(rs.getString("company_name"));
        r.setOrganizationName(rs.getString("organization_name"));
        if (rs.getObject("department_id") != null) {
            r.setDepartmentId(rs.getLong("department_id"));
        }
        r.setDepartmentName(rs.getString("department_name"));
        if (rs.getObject("job_position_id") != null) {
            r.setJobPositionId(rs.getLong("job_position_id"));
        }
        r.setJobPositionName(rs.getString("job_position_name"));
        if (rs.getObject("job_role_id") != null) {
            r.setJobRoleId(rs.getLong("job_role_id"));
        }
        r.setJobRoleName(rs.getString("job_role_name"));
        r.setQualification(rs.getString("qualification"));
        if (rs.getObject("experience") != null) {
            r.setExperience(rs.getInt("experience"));
        }
        if (rs.getObject("children") != null) {
            r.setChildren(rs.getInt("children"));
        }
        r.setEmergencyContact(rs.getString("emergency_contact"));
        r.setEmergencyContactName(rs.getString("emergency_contact_name"));
        r.setEmergencyContactRelation(rs.getString("emergency_contact_relation"));
        return r;
    }
}
