package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class BillingPackageUsageTest {
    @Test void packageMustFitEmployeeAndBranchLimits() {
        var usage=spy(new BillingUsage(mock(org.springframework.jdbc.core.JdbcTemplate.class)));
        doReturn(Map.of("currentEmployees",50L,"currentBranches",2L)).when(usage).forOrganization(1L,SubscriptionPlan.BASIC);
        assertThatCode(() -> usage.validateFit(1L,SubscriptionPlan.BASIC)).doesNotThrowAnyException();
        doReturn(Map.of("currentEmployees",51L,"currentBranches",2L)).when(usage).forOrganization(1L,SubscriptionPlan.BASIC);
        assertThatThrownBy(() -> usage.validateFit(1L,SubscriptionPlan.BASIC)).isInstanceOf(BillingFailure.class);
        doReturn(Map.of("currentEmployees",50L,"currentBranches",3L)).when(usage).forOrganization(1L,SubscriptionPlan.BASIC);
        assertThatThrownBy(() -> usage.validateFit(1L,SubscriptionPlan.BASIC)).isInstanceOf(BillingFailure.class);
    }
}
