package com.example.demo.platformops;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.util.*;

/** Delegated platform duties never expand the caller's tenant/workforce scope. */
@Component("platformTeam") @RequiredArgsConstructor
public class PlatformTeamAccess {
 private final JdbcTemplate jdbc;
 public static final Set<Role.RoleName> ROLES=Set.of(Role.RoleName.PLATFORM_ORGANIZATION_OPERATIONS,Role.RoleName.PLATFORM_SUPPORT,Role.RoleName.PLATFORM_BILLING);
 public boolean superAdmin(){var auth=SecurityContextHolder.getContext().getAuthentication();return auth!=null && auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));}
 public boolean operations(){return superAdmin() || delegated(Role.RoleName.PLATFORM_ORGANIZATION_OPERATIONS);}
 public boolean support(){return superAdmin() || delegated(Role.RoleName.PLATFORM_SUPPORT);}
 public boolean billing(){return superAdmin() || delegated(Role.RoleName.PLATFORM_BILLING);}
 private boolean delegated(Role.RoleName role){var auth=SecurityContextHolder.getContext().getAuthentication();if(auth==null || !(auth.getPrincipal() instanceof UserPrincipal p) || auth.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("ROLE_"+role.name())))return false;
  var assignments=jdbc.queryForList("SELECT ur.company_id FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id JOIN public.companies c ON c.id=ur.company_id JOIN public.platform_operator_configuration cfg ON cfg.organization_id=c.organization_id WHERE ur.user_id=? AND r.name=? AND ur.is_active=true AND ur.assignment_status='ACTIVE' AND (ur.effective_from IS NULL OR ur.effective_from<=CURRENT_DATE) AND (ur.expires_on IS NULL OR ur.expires_on>=CURRENT_DATE) AND ur.access_scope='SELF'",Long.class,p.getId(),role.name());
  return assignments.stream().anyMatch(company->eligible(p.getId(),company));
 }
 public boolean eligible(long user,long company){
  var rows=jdbc.queryForList("SELECT coalesce(c.schema_name,p.schema_name) schema_name FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id JOIN public.platform_operator_configuration cfg ON cfg.organization_id=c.organization_id JOIN public.organizations o ON o.id=c.organization_id WHERE c.id=? AND c.is_active=true AND c.status='ACTIVE' AND o.is_active=true AND o.status='ACTIVE'",company);
  if(rows.isEmpty())return false;String schema=(String)rows.getFirst().get("schema_name");if(schema==null || !schema.matches("[a-zA-Z_][a-zA-Z0-9_]*"))return false;
  return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM \""+schema+"\".employees e JOIN public.user_roles ur ON ur.user_id=e.user_id AND ur.company_id=e.company_id JOIN public.roles r ON r.id=ur.role_id WHERE e.user_id=? AND e.company_id=? AND e.is_active=true AND r.name='EMPLOYEE' AND ur.is_active=true AND ur.assignment_status='ACTIVE' AND (ur.effective_from IS NULL OR ur.effective_from<=CURRENT_DATE) AND (ur.expires_on IS NULL OR ur.expires_on>=CURRENT_DATE))",Boolean.class,user,company));
 }
 public void requireGrant(long user,long company){if(!superAdmin())throw new AccessDeniedException("Only Platform Super Admin can assign or revoke platform team roles");if(!eligible(user,company))throw new AccessDeniedException("Platform team roles require active employment in the configured internal Accrue organization");}
 public void requireOperations(){if(!operations())throw new AccessDeniedException("Organization Operations access required");}
 public void requireSupport(){if(!support())throw new AccessDeniedException("Platform Support access required");}
 public void requireBilling(){if(!billing())throw new AccessDeniedException("Platform Billing access required");}
 public Map<String,Object> configuration(){if(!superAdmin())throw new AccessDeniedException("Platform Super Admin access required");var rows=jdbc.queryForList("SELECT o.id,o.name FROM public.platform_operator_configuration cfg JOIN public.organizations o ON o.id=cfg.organization_id");var companies=jdbc.queryForList("SELECT c.id,c.name FROM public.companies c JOIN public.platform_operator_configuration cfg ON cfg.organization_id=c.organization_id WHERE c.is_active=true ORDER BY c.name");return Map.of("organizations",rows,"companies",companies);}
}
