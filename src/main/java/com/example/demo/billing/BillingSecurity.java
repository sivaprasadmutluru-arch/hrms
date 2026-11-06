package com.example.demo.billing;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Set;
@Component @RequiredArgsConstructor
public class BillingSecurity {
    private final UserRoleRepository roles;
    private final com.example.demo.platformops.PlatformTeamAccess platformTeam;
    @Transactional(readOnly=true)
    public void require(Long organizationId) {
        if(platformTeam.billing())return;
        requireTenantOwner(organizationId);
    }
    @Transactional(readOnly=true)
    public void requireTenantOwner(Long organizationId) {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if (auth==null || !(auth.getPrincipal() instanceof UserPrincipal principal)) throw new BillingFailure(401,"Please sign in");
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"))) return;
        var effective=new java.util.ArrayList<>(roles.findByUserId(principal.getId()));
        principal.getPositionGrants().stream().filter(p -> p.profile()==com.example.demo.auth.service.PositionAccessService.Profile.CEO).forEach(p -> {
            var assignment=p.assignment();
            assignment.setCompany(roles.findByUserId(principal.getId()).stream().filter(r -> r.getCompany()!=null && (r.getCompany().getId().equals(p.rootCompanyId()) || r.getCompany().getParentCompanyId()!=null && r.getCompany().getParentCompanyId().equals(p.rootCompanyId()))).map(r -> r.getCompany()).findFirst().orElse(null));
            effective.add(assignment);
        });
        boolean owner=effective.stream().filter(r -> r.isEffectiveOn(LocalDate.now()))
            .filter(r -> r.getCompany()!=null && r.getCompany().getOrganization()!=null)
            .anyMatch(r -> organizationId.equals(r.getCompany().getOrganization().getId())
                && r.getAccessScope()==UserRole.AccessScope.ENTERPRISE
                && Set.of("ENTERPRISE_ADMIN","CEO","COMPANY_ADMIN","SUPER_ADMIN").contains(r.getRole().getName().name()));
        if (!owner) throw new BillingFailure(403,"Only an administrator of this organization can manage its billing");
    }
}
