package com.example.demo.common.context;

import com.example.demo.auth.entity.UserRole;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AccessScopeContextTest {

    @Test
    void emptyScopedCompanyListIsNeverTreatedAsUnrestricted() {
        var scope = new AccessScopeContext.ScopeData(
                7L, 20L, UserRole.AccessScope.SELF, List.of());

        assertThat(scope.hasUnrestrictedAccess()).isFalse();
        assertThat(scope.canAccess(20L)).isFalse();
    }

    @Test
    void onlyExplicitNullScopeRepresentsPlatformAccess() {
        var scope = new AccessScopeContext.ScopeData(1L, 20L, null, List.of());

        assertThat(scope.hasUnrestrictedAccess()).isTrue();
        assertThat(scope.canAccess(999L)).isTrue();
    }
}
