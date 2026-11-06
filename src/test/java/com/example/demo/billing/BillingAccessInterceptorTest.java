package com.example.demo.billing;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.auth.service.EmployeeCompanyGuard;
import com.example.demo.common.context.CompanyContext;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class BillingAccessInterceptorTest {
    BillingSubscriptionRepository subscriptions=mock(BillingSubscriptionRepository.class);
    JdbcTemplate jdbc=mock(JdbcTemplate.class); EmployeeCompanyGuard companyGuard=mock(EmployeeCompanyGuard.class);
    BillingAccessInterceptor interceptor=new BillingAccessInterceptor(subscriptions,jdbc,companyGuard);
    void login(String role) { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(mock(UserPrincipal.class),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))); }
    @AfterEach void clear() { CompanyContext.clear(); SecurityContextHolder.clearContext(); }
    @Test void expiredWorkspaceReturns402ButPlatformSupportRemainsAvailable() throws Exception {
        login("EMPLOYEE"); CompanyContext.set(2L);
        var s=new BillingSubscription(); s.setLegacyAccess(false); s.setStatus("active"); s.setPaidUntil(java.time.Instant.now().minusSeconds(1));
        when(jdbc.queryForList(anyString(),eq(Long.class),eq(2L))).thenReturn(List.of(2L)); when(subscriptions.findById(2L)).thenReturn(Optional.of(s));
        var response=new MockHttpServletResponse();
        assertThat(interceptor.preHandle(new MockHttpServletRequest(),response,new Object())).isFalse();
        assertThat(response.getStatus()).isEqualTo(402); assertThat(response.getContentAsString()).contains("SUBSCRIPTION_REQUIRED");
        login("PLATFORM_SUPER_ADMIN"); assertThat(interceptor.preHandle(new MockHttpServletRequest(),new MockHttpServletResponse(),new Object())).isTrue();
    }
    @Test void missingLegacyBillingRecordDoesNotInventAnExpiry() throws Exception {
        login("EMPLOYEE"); CompanyContext.set(2L);
        when(jdbc.queryForList(anyString(),eq(Long.class),eq(2L))).thenReturn(List.of(2L)); when(subscriptions.findById(2L)).thenReturn(Optional.empty());
        assertThat(interceptor.preHandle(new MockHttpServletRequest(),new MockHttpServletResponse(),new Object())).isTrue();
    }
}
