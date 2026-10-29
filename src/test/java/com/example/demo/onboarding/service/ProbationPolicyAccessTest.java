package com.example.demo.onboarding.service;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.onboarding.repository.ProbationPolicyRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProbationPolicyAccessTest {
    @Mock ProbationPolicyRepository policies;
    @InjectMocks ProbationConfirmationService service;
    @AfterEach void clear() { AccessScopeContext.clear(); }
    @Test void cannotModifyOtherCompanyPolicy() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 1L, UserRole.AccessScope.BRANCH, List.of(1L)));
        assertThrows(AccessDeniedException.class, () -> service.savePolicy(2L, true, LocalDate.now()));
        verifyNoInteractions(policies);
    }
    @Test void selfScopeCannotReadCompanyProbationList() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 1L, UserRole.AccessScope.SELF, List.of(1L)));
        assertThrows(AccessDeniedException.class, () -> service.list(1L, LocalDate.now()));
        verifyNoInteractions(policies);
    }
    @Test void departmentScopeCannotReadWholeCompanyProbationList() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 1L, UserRole.AccessScope.DEPARTMENT, List.of(1L)));
        assertThrows(AccessDeniedException.class, () -> service.list(1L, LocalDate.now()));
        verifyNoInteractions(policies);
    }
}
