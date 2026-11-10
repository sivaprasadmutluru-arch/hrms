package com.example.demo.auth.service;

import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.*;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class PositionAccessService {
    private final JdbcTemplate jdbc;
    private final CompanyRepository companies;
    private final RoleRepository roles;
    private final UserRoleRepository assignments;
    public enum Profile {
        NONE(null,"Existing roles only",UserRole.AccessScope.SELF),
        CEO(Role.RoleName.CEO,"Full business and billing access within this organization; no platform access",UserRole.AccessScope.ENTERPRISE),
        COO(Role.RoleName.HR_MANAGER,"Organization-wide workforce operations and approvals; no payroll, billing or security administration",UserRole.AccessScope.ENTERPRISE),
        EMPLOYEE(Role.RoleName.EMPLOYEE,"Own records, attendance, leave, documents, tickets and payslips",UserRole.AccessScope.SELF);
        public final Role.RoleName role; public final String description; public final UserRole.AccessScope scope;
        Profile(Role.RoleName role,String description,UserRole.AccessScope scope) { this.role=role; this.description=description; this.scope=scope; }
    }
    public record Grant(Long companyId,Long rootCompanyId,Long employeeId,Long positionId,String positionName,Profile profile,Role role) {
        public boolean appliesTo(Long targetId,Long targetRootId) {
            return profile.scope==UserRole.AccessScope.ENTERPRISE ? rootCompanyId.equals(targetRootId) : companyId.equals(targetId);
        }
        public UserRole assignment() {
            var a=new UserRole(); var c=new Company(); c.setId(profile.scope==UserRole.AccessScope.ENTERPRISE ? rootCompanyId : companyId);
            a.setCompany(c); a.setRole(role); a.setAccessScope(profile.scope); a.setEmployeeScopeId(employeeId);
            a.setAssignmentReason("Job position: "+positionName+" ("+profile+")"); return a;
        }
    }
    public List<Map<String,Object>> catalog() {
        return Arrays.stream(Profile.values()).map(p -> Map.<String,Object>of("id",p.name(),"description",p.description,"scope",p.scope.name())).toList();
    }
    private String schema(Company c) {
        Company root=c.isBranch() ? companies.findById(c.getParentCompanyId()).orElseThrow() : c;
        String value=root.getSchemaName();
        if(value==null || !value.matches("[A-Za-z_][A-Za-z0-9_]*")) throw new BadRequestException("Company schema is not ready");
        return "\""+value+"\"";
    }
    private Long rootId(Company c) { return c.isBranch() ? c.getParentCompanyId() : c.getId(); }
    private static boolean organizationScope(UserRole a) { return a.getAccessScope()==UserRole.AccessScope.ENTERPRISE || a.getAccessScope()==UserRole.AccessScope.HEAD_OFFICE; }
    /** Positions require live employee and explicit company membership; policy is read on every request. */
    @Transactional(readOnly=true)
    public List<Grant> resolve(User user) {
        var membership=user.getUserRoles().stream().filter(a -> a.getCompany()!=null && a.isEffectiveOn(LocalDate.now())).toList();
        Set<Long> roots=new HashSet<>();
        for(var a:membership) roots.add(rootId(a.getCompany()));
        List<Grant> result=new ArrayList<>();
        for(Long rootId:roots) {
            Company root=companies.findById(rootId).orElse(null);
            if(root==null || !root.isActive() || !root.isSchemaReady()) continue;
            String schema=schema(root);
            var rows=jdbc.queryForList("SELECT e.id employee_id,e.company_id,jp.id position_id,jp.name,p.profile FROM "+schema+".employees e JOIN "+schema+".job_positions jp ON jp.id=e.job_position_id AND jp.company_id=e.company_id JOIN public.job_position_access p ON p.company_id=e.company_id AND p.job_position_id=jp.id JOIN public.companies c ON c.id=e.company_id WHERE e.user_id=? AND e.is_active=true AND jp.is_active=true AND c.is_active=true AND (c.id=? OR c.parent_company_id=?)",user.getId(),rootId,rootId);
            for(var row:rows) {
                Long companyId=((Number)row.get("company_id")).longValue();
                boolean member=membership.stream().anyMatch(a -> a.getCompany().getId().equals(companyId)
                    || (rootId(a.getCompany()).equals(rootId) && organizationScope(a)));
                if(!member) continue;
                Profile profile=Profile.valueOf((String)row.get("profile")); if(profile==Profile.NONE) continue;
                var source=roles.findByName(profile.role).filter(Role::isActive).orElse(null); if(source==null) continue;
                // A copy avoids mutating the shared role or leaking platform permissions from the legacy CEO role.
                var role=new Role(); role.setId(source.getId()); role.setName(source.getName());
                role.setPermissions(source.getPermissions().stream().filter(p -> !p.getName().startsWith("organization:") && !p.getName().startsWith("platform:")).collect(Collectors.toSet()));
                result.add(new Grant(companyId,rootId,((Number)row.get("employee_id")).longValue(),((Number)row.get("position_id")).longValue(),(String)row.get("name"),profile,role));
            }
        }
        return result;
    }
    public static List<GrantedAuthority> authorities(List<UserRole> explicit,List<Grant> positions) {
        var result=new ArrayList<>(UserPrincipal.authoritiesForAssignments(explicit));
        Set<String> existing=result.stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
        for(var p:positions) result.addAll(UserPrincipal.authoritiesForAssignments(List.of(p.assignment())));
        // Scope expansion must not broaden an EMPLOYEE payslip grant into organization payroll access.
        if(positions.stream().anyMatch(p -> p.profile()==Profile.COO) && positions.stream().noneMatch(p -> p.profile()==Profile.CEO)
                && explicit.stream().noneMatch(PositionAccessService::financialAdministrator)) {
            result.removeIf(a -> a.getAuthority().startsWith("payroll:"));
            result.add(new SimpleGrantedAuthority("POSITION_PAYROLL_EXCLUDED"));
        }
        if(positions.stream().anyMatch(p -> p.profile()==Profile.COO) && positions.stream().noneMatch(p -> p.profile()==Profile.CEO)
                && explicit.stream().noneMatch(a -> a.getRole().getName()!=Role.RoleName.EMPLOYEE)) result.add(new SimpleGrantedAuthority("POSITION_OPERATIONS_ONLY"));
        if(!positions.isEmpty()) {
            // Titles cannot manage security assignments unless the user also has an explicit administrator role.
            if(explicit.stream().noneMatch(PositionAccessService::securityAdministrator)) result.add(new SimpleGrantedAuthority("POSITION_SECURITY_EXCLUDED"));
            if(positions.stream().allMatch(p -> p.profile()==Profile.COO || p.profile()==Profile.EMPLOYEE)
                    && !existing.contains("ROLE_ENTERPRISE_ADMIN") && !existing.contains("ROLE_PLATFORM_SUPER_ADMIN")) result.add(new SimpleGrantedAuthority("POSITION_BILLING_EXCLUDED"));
        }
        return result.stream().distinct().toList();
    }
    public static boolean payrollExcluded() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        return auth!=null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("POSITION_PAYROLL_EXCLUDED"));
    }
    public static void requirePayrollAccess() {
        if(payrollExcluded()) throw new AccessDeniedException("Payroll is excluded from your job-position access profile");
    }
    private static boolean financialAdministrator(UserRole a) {
        if(a.getRole().getName()==Role.RoleName.ACCOUNT_MANAGER && a.getAccessLevel()==UserRole.AccessLevel.PARTIAL) return false;
        return switch(a.getRole().getName()) {
            case PLATFORM_SUPER_ADMIN,SUPER_ADMIN,ENTERPRISE_ADMIN,COMPANY_ADMIN,CEO,ACCOUNT_MANAGER,COMPANY_MANAGER,BRANCH_ADMIN,ACCOUNTANT,ACCOUNTS_MANAGER -> true;
            default -> false;
        };
    }
    public static boolean securityAdministrator(UserRole a) {
        return switch(a.getRole().getName()) {
            case PLATFORM_SUPER_ADMIN,SUPER_ADMIN,COMPANY_ADMIN,ENTERPRISE_ADMIN -> true;
            default -> false;
        };
    }
    public static UserRole primary(UserRole explicit,UserPrincipal principal,CompanyRepository companies) {
        UserRole best=explicit;
        for(var p:principal.getPositionGrants()) {
            var a=p.assignment(); a.setCompany(companies.findById(a.getCompany().getId()).orElseThrow());
            if(best==null || best.getAccessScope()==null || a.getAccessScope().ordinal()>best.getAccessScope().ordinal()) best=a;
        }
        return best;
    }
    public boolean canAdminister(Long companyId) {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !(auth.getPrincipal() instanceof UserPrincipal p)) return false;
        var target=companies.findById(companyId).orElse(null); if(target==null) return false;
        return assignments.findByUserId(p.getId()).stream().filter(a -> a.isEffectiveOn(LocalDate.now()) && securityAdministrator(a)).anyMatch(a ->
            a.getRole().getName()==Role.RoleName.PLATFORM_SUPER_ADMIN || (a.getCompany()!=null && (a.getCompany().getId().equals(companyId)
              || (rootId(a.getCompany()).equals(rootId(target)) && organizationScope(a)))));
    }
    public void requireAdministrator(Long companyId) {
        if(!canAdminister(companyId)) throw new AccessDeniedException("An explicitly assigned company or platform administrator must manage position access");
    }
    @Transactional(readOnly=true)
    public Map<String,Object> get(Long companyId,Long positionId) {
        requireAdministrator(companyId);
        var company=companies.findById(companyId).orElseThrow();
        var rows=jdbc.queryForList("SELECT id,name FROM "+schema(company)+".job_positions WHERE id=? AND company_id=?",positionId,companyId);
        if(rows.isEmpty()) throw new BadRequestException("Job position does not belong to this company");
        var policies=jdbc.queryForList("SELECT profile,version,updated_at,updated_by FROM public.job_position_access WHERE company_id=? AND job_position_id=?",companyId,positionId);
        Map<String,Object> result=new LinkedHashMap<>(); result.put("companyId",companyId); result.put("positionId",positionId); result.put("positionName",rows.getFirst().get("name"));
        result.put("policy",policies.isEmpty() ? Map.of("profile","NONE","version",0) : policies.getFirst());
        result.put("employeesAffected",jdbc.queryForObject("SELECT count(*) FROM "+schema(company)+".employees WHERE company_id=? AND job_position_id=? AND is_active=true",Long.class,companyId,positionId));
        result.put("profiles",catalog());
        result.put("history",jdbc.queryForList("SELECT old_profile,new_profile,actor,changed_at FROM public.job_position_access_audit WHERE company_id=? AND job_position_id=? ORDER BY id DESC LIMIT 10",companyId,positionId));
        return result;
    }
    @Transactional
    public Map<String,Object> save(Long companyId,Long positionId,Profile profile,long expectedVersion) {
        requireAdministrator(companyId);
        if(profile.role!=null && roles.findByName(profile.role).filter(Role::isActive).isEmpty()) throw new BadRequestException("The access profile role is not configured");
        var company=companies.findById(companyId).orElseThrow();
        var position=jdbc.queryForList("SELECT id,name FROM "+schema(company)+".job_positions WHERE id=? AND company_id=? FOR UPDATE",positionId,companyId);
        if(position.isEmpty()) throw new BadRequestException("Job position does not belong to this company");
        var current=jdbc.queryForList("SELECT profile,version FROM public.job_position_access WHERE company_id=? AND job_position_id=?",companyId,positionId);
        long version=current.isEmpty()?0:((Number)current.getFirst().get("version")).longValue();
        if(version!=expectedVersion) throw new BadRequestException("Position access changed. Reopen the settings and try again");
        String previous=current.isEmpty()?"NONE":(String)current.getFirst().get("profile");
        if(previous.equals(profile.name())) return get(companyId,positionId);
        var auth=SecurityContextHolder.getContext().getAuthentication(); var principal=(UserPrincipal)auth.getPrincipal();
        jdbc.update("INSERT INTO public.job_position_access(company_id,job_position_id,profile,version,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(company_id,job_position_id) DO UPDATE SET profile=EXCLUDED.profile,version=EXCLUDED.version,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP",companyId,positionId,profile.name(),version+1,principal.getId());
        jdbc.update("INSERT INTO public.job_position_access_audit(company_id,job_position_id,position_name,old_profile,new_profile,actor) VALUES(?,?,?,?,?,?)",companyId,positionId,position.getFirst().get("name"),previous,profile.name(),auth.getName());
        return get(companyId,positionId);
    }
    public void requireIdentityChange(Long companyId,Long positionId) {
        if(companyId!=null && positionId!=null && Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.job_position_access WHERE company_id=? AND job_position_id=? AND profile IN ('CEO','COO'))",Boolean.class,companyId,positionId))) requireAdministrator(companyId);
    }
    public void requirePositionChange(Long previousCompany,Long previousPosition,Long companyId,Long positionId) {
        if(Objects.equals(previousCompany,companyId) && Objects.equals(previousPosition,positionId)) return;
        for(var pair:List.of(new Long[]{previousCompany,previousPosition},new Long[]{companyId,positionId})) {
            if(pair[0]!=null && pair[1]!=null && Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.job_position_access WHERE company_id=? AND job_position_id=? AND profile<>'NONE')",Boolean.class,pair[0],pair[1]))) requireAdministrator(pair[0]);
        }
    }
}
