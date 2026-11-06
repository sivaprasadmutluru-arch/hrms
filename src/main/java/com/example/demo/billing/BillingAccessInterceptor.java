package com.example.demo.billing;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.auth.service.EmployeeCompanyGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.*;
import java.time.Instant;

@Component @RequiredArgsConstructor
public class BillingAccessInterceptor implements HandlerInterceptor {
    private final BillingSubscriptionRepository subscriptions;
    private final JdbcTemplate jdbc;
    private final EmployeeCompanyGuard companyGuard;
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) throws Exception {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if (authentication==null || !(authentication.getPrincipal() instanceof UserPrincipal user)) return true;
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"))) return true;
        Long companyId=com.example.demo.common.context.CompanyContext.get();
        if (companyId==null) {
            var primary=companyGuard.primaryRole(user.getId());
            if (primary!=null && primary.getCompany()!=null) companyId=primary.getCompany().getId();
        }
        if (companyId==null) return true;
        var orgIds=jdbc.queryForList("SELECT organization_id FROM public.companies WHERE id=? AND organization_id IS NOT NULL",Long.class,companyId);
        if (orgIds.isEmpty()) return true;
        var subscription=subscriptions.findById(orgIds.get(0)).orElse(null);
        if (subscription==null || subscription.hasAccess(Instant.now())) return true;
        response.setStatus(402); response.setContentType("application/json");
        String message = subscription.getPlan()==com.example.demo.base.enums.SubscriptionPlan.FREE
                ? "Your one-month Free access has ended. An organization administrator can choose a paid plan from Subscription."
                : "Your organization needs an active subscription. An organization administrator can renew it from Subscription.";
        response.getWriter().write("{\"status\":402,\"code\":\"SUBSCRIPTION_REQUIRED\",\"message\":\""+message+"\"}");
        return false;
    }
}
