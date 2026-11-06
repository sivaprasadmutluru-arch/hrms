package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class BillingRestorationUsageTest {
    @Test void prospectiveCountIncludesArchivedCompanyEmployeesAndDeduplicatesSharedSchemas() {
        var jdbc=mock(JdbcTemplate.class); var usage=new BillingUsage(jdbc);
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenReturn(List.of(
            Map.of("id",10L,"schema_name","tenant","company_type","HEAD_OFFICE"),
            Map.of("id",11L,"schema_name","tenant","company_type","BRANCH")));
        when(jdbc.queryForObject(startsWith("SELECT EXISTS"),eq(Boolean.class),eq("tenant"))).thenReturn(true);
        when(jdbc.queryForObject(startsWith("SELECT count(*)"),eq(Long.class),any(Object[].class))).thenReturn(21L);
        assertThatThrownBy(() -> usage.validateRestoration(1L,SubscriptionPlan.FREE,List.of(11L),null)).isInstanceOf(BillingFailure.class);
        verify(jdbc).queryForList("SELECT id, schema_name, company_type FROM public.companies WHERE organization_id=? AND (is_active=true OR id IN (?))",1L,11L);
        verify(jdbc,times(1)).queryForObject(startsWith("SELECT count(*)"),eq(Long.class),any(Object[].class));
    }
    @Test void prospectiveEmployeeBoundaryAndPreviousAgreementCapacityAreEnforced() {
        var usage=spy(new BillingUsage(mock(JdbcTemplate.class)));
        doReturn(Map.of("currentEmployees",20L,"currentBranches",1L)).when(usage).forOrganizationIncluding(1L,SubscriptionPlan.FREE,List.of(11L));
        assertThatCode(() -> usage.validateRestoration(1L,SubscriptionPlan.FREE,List.of(11L),null)).doesNotThrowAnyException();
        assertThatThrownBy(() -> usage.validateRestoration(1L,SubscriptionPlan.FREE,List.of(11L),10)).isInstanceOf(BillingFailure.class);
    }
    @Test void prospectiveOrganizationWideBranchCountCannotExceedThePlan() {
        var usage=spy(new BillingUsage(mock(JdbcTemplate.class)));
        doReturn(Map.of("currentEmployees",1L,"currentBranches",3L)).when(usage).forOrganizationIncluding(1L,SubscriptionPlan.BASIC,List.of(11L,12L));
        assertThatThrownBy(() -> usage.validateRestoration(1L,SubscriptionPlan.BASIC,List.of(11L,12L),null)).isInstanceOf(BillingFailure.class);
    }
}
