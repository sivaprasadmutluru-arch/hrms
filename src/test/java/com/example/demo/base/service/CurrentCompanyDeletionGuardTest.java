package com.example.demo.base.service;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CurrentCompanyDeletionGuardTest {
    @AfterEach void clear() { CompanyContext.clear(); SecurityContextHolder.clearContext(); }

    void login(long company) {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getLoginCompanyId()).thenReturn(company);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    @Test void protectsLoginCompanyEvenInAllCompaniesMode() {
        login(10);
        assertThatThrownBy(() -> CurrentCompanyDeletionGuard.check(List.of(10L)))
                .isInstanceOf(BadRequestException.class);
    }
    @Test void switchingWorkspaceCannotBypassLoginCompanyProtection() {
        login(10); CompanyContext.set(20L);
        assertThatThrownBy(() -> CurrentCompanyDeletionGuard.check(List.of(10L)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> CurrentCompanyDeletionGuard.check(List.of(20L)))
                .isInstanceOf(BadRequestException.class);
        assertThatCode(() -> CurrentCompanyDeletionGuard.check(List.of(30L))).doesNotThrowAnyException();
    }
    @Test void headOfficeDeleteCannotRemoveProtectedBranch() {
        login(11);
        assertThatThrownBy(() -> CurrentCompanyDeletionGuard.check(List.of(10L, 11L)))
                .isInstanceOf(BadRequestException.class);
    }
}
