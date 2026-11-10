package com.example.demo.base.service;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.BadRequestException;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Collection;

/** Protect both the signed-in company and the selected workspace from self-deletion. */
public final class CurrentCompanyDeletionGuard {
    private CurrentCompanyDeletionGuard() {}

    public static boolean hasProtectedCompany() {
        return CompanyContext.get() != null || loginCompanyId() != null;
    }

    public static void check(Collection<Long> affectedCompanyIds) {
        Long current = CompanyContext.get();
        Long login = loginCompanyId();
        if ((current != null && affectedCompanyIds.contains(current))
                || (login != null && affectedCompanyIds.contains(login))) {
            throw new BadRequestException(
                    "Cannot delete the company used for this login or the currently selected company, or their organization.");
        }
    }

    private static Long loginCompanyId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal
                ? principal.getLoginCompanyId() : null;
    }
}
