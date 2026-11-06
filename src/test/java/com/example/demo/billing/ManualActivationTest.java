package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.data.domain.Page;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class ManualActivationTest {
    BillingServiceTest f=new BillingServiceTest();
    BillingSubscription s=new BillingSubscription();
    Map<String,BillingEvent> audit=new HashMap<>();
    @BeforeEach void setup() {
        f.config.setManualEnabled(true); s.setOrganizationId(2L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin","",List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));
        when(f.subscriptions.findById(2L)).thenReturn(Optional.of(s));
        when(f.invoices.findByOrganizationIdOrderByCreatedAtDesc(eq(2L),any())).thenReturn(Page.empty());
        when(f.events.findById(anyString())).thenAnswer(i -> Optional.ofNullable(audit.get(i.getArgument(0))));
        when(f.events.saveAndFlush(any())).thenAnswer(i -> { BillingEvent e=i.getArgument(0); audit.put(e.getId(),e); return e; });
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void existingSeatAgreementConvertsOnlyOnExplicitRenewalAndKeepsCurrentDates() throws Exception {
        var started=Instant.parse("2026-01-01T00:00:00Z");
        var previousEnd=Instant.now().plusSeconds(86400*60);
        s.setPlan(SubscriptionPlan.STANDARD); s.setCycle(BillingCycle.MONTHLY); s.setManualAccess(true);
        s.setLegacyAccess(false); s.setSeatCount(10); s.setStartedAt(started); s.setPeriodStart(started);
        s.setPeriodEnd(previousEnd); s.setPaidUntil(previousEnd); f.org.setPurchasedSeats(10);
        f.service.catalog();
        assertThat(s.getPaidUntil()).isEqualTo(previousEnd); assertThat(f.org.getPurchasedSeats()).isEqualTo(10);
        var id=UUID.randomUUID();
        f.service.activateManually(2L,SubscriptionPlan.STANDARD,BillingCycle.MONTHLY,id,"Renew fixed package");
        assertThat(s.getStartedAt()).isEqualTo(started); assertThat(s.getPeriodStart()).isEqualTo(started);
        assertThat(s.getPaidUntil()).isAfter(previousEnd); assertThat(f.org.getPurchasedSeats()).isNull();
        assertThat(s.getSeatCount()).isNull();
        assertThat(f.json.readTree(audit.get("manual_"+id).getDetails()).path("pricingModel").asText()).isEqualTo("FIXED_PACKAGE");
    }
    @Test void grantsDatedAccessWithoutPaymentAndAuditsActor() throws Exception {
        var id=UUID.randomUUID(); var result=f.service.activateManually(2L,SubscriptionPlan.STANDARD,BillingCycle.MONTHLY,id,"Temporary bypass");
        assertThat(result.get("status")).isEqualTo("MANUAL_ACTIVE"); assertThat(s.isManualAccess()).isTrue();
        assertThat(s.getAmountMinor()).isZero(); assertThat(s.hasAccess(Instant.now())).isTrue();
        assertThat(s.getPaidUntil()).isEqualTo(BillingService.manualPeriodEnd(s.getPeriodStart(),s.getPeriodStart(),BillingCycle.MONTHLY));
        assertThat(s.hasAccess(s.getPaidUntil())).isFalse();
        var event=audit.get("manual_"+id); assertThat(event.getActor()).isEqualTo("admin");
        assertThat(f.json.readTree(event.getDetails()).path("amountCollectedMinor").asInt()).isZero();
        verifyNoInteractions(f.razorpay); verify(f.usage).validateFit(2L,SubscriptionPlan.STANDARD);
    }
    @Test void duplicateRequestCannotExtendAccessAndDifferentPayloadIsRejected() {
        var id=UUID.randomUUID(); f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,id,"Temporary bypass");
        var end=s.getPaidUntil(); f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,id,"Temporary bypass");
        assertThat(s.getPaidUntil()).isEqualTo(end); assertThat(audit).hasSize(1);
        assertThatThrownBy(() -> f.service.activateManually(2L,SubscriptionPlan.ENTERPRISE,BillingCycle.YEARLY,id,"Temporary bypass")).isInstanceOf(BillingFailure.class);
    }
    @Test void renewalExtendsExistingExpiry() {
        f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,UUID.randomUUID(),"Temporary bypass");
        var end=s.getPaidUntil(); var anchor=s.getPeriodStart();
        f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,UUID.randomUUID(),"Temporary renewal");
        assertThat(s.getPaidUntil()).isEqualTo(BillingService.manualPeriodEnd(end,anchor,BillingCycle.MONTHLY));
    }
    @Test void disabledAndNonPlatformAccountsCannotActivate() {
        f.config.setManualEnabled(false);
        assertThatThrownBy(() -> f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,UUID.randomUUID(),"Temporary bypass")).isInstanceOf(BillingFailure.class);
        f.config.setManualEnabled(true);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner","",List.of(new SimpleGrantedAuthority("ROLE_ENTERPRISE_ADMIN"))));
        assertThatThrownBy(() -> f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,UUID.randomUUID(),"Temporary bypass")).isInstanceOf(BillingFailure.class);
        verify(f.subscriptions,never()).saveAndFlush(any());
    }
    @Test void paidAccountsCannotBeOverridden() {
        s.setRazorpaySubscriptionId("sub_existing");
        assertThatThrownBy(() -> f.service.activateManually(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY,UUID.randomUUID(),"Temporary bypass")).isInstanceOf(BillingFailure.class);
    }
    @Test void calendarTermsRetainMonthEndAndLeapDayAnchor() {
        var jan=Instant.parse("2027-01-31T08:00:00Z"); var feb=BillingService.manualPeriodEnd(jan,jan,BillingCycle.MONTHLY);
        assertThat(feb).isEqualTo(Instant.parse("2027-02-28T08:00:00Z"));
        assertThat(BillingService.manualPeriodEnd(feb,jan,BillingCycle.MONTHLY)).isEqualTo(Instant.parse("2027-03-31T08:00:00Z"));
        var leap=Instant.parse("2028-02-29T08:00:00Z"); assertThat(BillingService.manualPeriodEnd(leap,leap,BillingCycle.YEARLY)).isEqualTo(Instant.parse("2029-02-28T08:00:00Z"));
    }
    @Test void defaultOffAndLiveRazorpayCannotEnableBypass() {
        assertThat(new BillingProperties().isManualEnabled()).isFalse(); f.config.setKeyId("rzp_live_placeholder");
        assertThatThrownBy(f.config::validate).isInstanceOf(IllegalStateException.class);
    }
}
