package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class FreeActivationTest {
    BillingServiceTest f=new BillingServiceTest();
    BillingSubscription s=new BillingSubscription();
    @BeforeEach void setup() {
        s.setOrganizationId(2L);
        when(f.subscriptions.findById(2L)).thenReturn(Optional.of(s));
        when(f.invoices.findByOrganizationIdOrderByCreatedAtDesc(eq(2L),any())).thenReturn(Page.empty());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner","",List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void freeAccessRemainsActiveIndefinitelyWithoutPayment() {
        f.config.setKeyId(""); f.config.setManualEnabled(false);
        var result=f.service.activateFree(2L);
        assertThat(result.get("status")).isEqualTo("FREE_ACTIVE");
        assertThat(s.isLegacyAccess()).isFalse(); assertThat(s.isManualAccess()).isFalse();
        assertThat(s.getPlan()).isEqualTo(SubscriptionPlan.FREE);
        assertThat(s.getCycle()).isNull();
        assertThat(s.hasAccess(Instant.now())).isTrue();
        assertThat(s.hasAccess(Instant.now().plus(365, java.time.temporal.ChronoUnit.DAYS))).isTrue();
        assertThat(f.org.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.FREE);
        verify(f.usage).validateFit(2L,SubscriptionPlan.FREE);
        verify(f.usage).applyPlanLimits(2L,SubscriptionPlan.FREE);
        verify(f.events).saveAndFlush(argThat(e -> "FREE_ACTIVATED".equals(e.getType()) && "owner".equals(e.getActor())));
        f.service.activateFree(2L); verify(f.events,times(1)).saveAndFlush(any());
        verifyNoInteractions(f.razorpay);
    }
    @Test void overLimitCannotActivateOrChangeExistingPlan() {
        doThrow(new BillingFailure(409,"Over limit")).when(f.usage).validateFit(2L,SubscriptionPlan.FREE);
        assertThatThrownBy(() -> f.service.activateFree(2L)).isInstanceOf(BillingFailure.class);
        verify(f.subscriptions,never()).saveAndFlush(any());
        assertThat(f.org.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.BASIC);
    }
    @Test void freeCannotBeActivatedThroughPaidFlows() {
        assertThatThrownBy(() -> f.service.checkout(2L,SubscriptionPlan.FREE,BillingCycle.MONTHLY)).isInstanceOf(BillingFailure.class);
        assertThatThrownBy(() -> f.service.activateManually(2L,SubscriptionPlan.FREE,BillingCycle.MONTHLY,UUID.randomUUID(),"Bypass request")).isInstanceOf(BillingFailure.class);
        verifyNoInteractions(f.razorpay);
    }
    @Test void unpaidUpgradePreservesFreeAccess() throws Exception {
        f.service.activateFree(2L);s.setRazorpaySubscriptionId("sub_2");s.setRazorpayPlanId("plan_STANDARD_MONTHLY");
        when(f.razorpay.get("/invoices?subscription_id=sub_2&count=20")).thenReturn(f.invoice("issued"));
        f.service.synchronizeObject(s,f.object("created"));
        assertThat(s.getPlan()).isEqualTo(SubscriptionPlan.FREE);assertThat(s.hasAccess(Instant.now())).isTrue();
        when(f.razorpay.get("/invoices?subscription_id=sub_2&count=20")).thenReturn(f.invoice("paid"));
        f.service.synchronizeObject(s,f.object("active"));
        assertThat(s.getPlan()).isEqualTo(SubscriptionPlan.STANDARD);
    }
    @Test void freeDoesNotRequirePaidPlanPrices() {
        f.config.getPrices().remove("free-monthly"); f.config.getPrices().remove("free-yearly");
        assertThat(f.config.configured()).isTrue();
        assertThat(BillingCatalog.entries()).hasSize(4);
        assertThat(SubscriptionPlan.FREE.getMaxEmployees()).isEqualTo(15);
        assertThat(BillingCatalog.plan(SubscriptionPlan.FREE).monthlyAmountMinor()).isZero();
    }
}
