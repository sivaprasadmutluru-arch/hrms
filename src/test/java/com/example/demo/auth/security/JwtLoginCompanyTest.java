package com.example.demo.auth.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtLoginCompanyTest {
    @Test void loginCompanyIsStoredInVerifiedToken() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", "test-secret-with-at-least-sixty-four-bytes-for-hmac-signing-only-1234567890");
        ReflectionTestUtils.setField(provider, "jwtExpirationMs", 60000L);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getUsername()).thenReturn("admin");
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        String token = provider.generateToken(auth, 42L);
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.getLoginCompanyIdFromToken(token)).isEqualTo(42L);
        assertThat(provider.getLoginCompanyIdFromToken(provider.generateToken(auth))).isNull();
    }
}
