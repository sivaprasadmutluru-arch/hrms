package com.example.demo.billing;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
class BillingSubscriptionTest {
    Instant end=Instant.parse("2030-12-01T00:00:00Z");
    BillingSubscription paid(String status) { var s=new BillingSubscription(); s.setLegacyAccess(false); s.setStatus(status); s.setPaidUntil(end); return s; }
    @Test void activeAccessEndsAtExactPaidBoundary() {
        assertThat(paid("active").hasAccess(end.minusSeconds(1))).isTrue();
        assertThat(paid("active").hasAccess(end)).isFalse();
        assertThat(paid("active").hasAccess(end.plusSeconds(1))).isFalse();
    }
    @Test void failedPaymentDoesNotExtendPaidAccess() {
        assertThat(paid("past_due").hasAccess(end.minusSeconds(1))).isTrue();
        assertThat(paid("past_due").hasAccess(end.plusSeconds(1))).isFalse();
    }
    @Test void canceledRenewalKeepsAlreadyPaidAccess() {
        var s=paid("active"); s.setCancelAtPeriodEnd(true); s.setCanceledAt(end.minusSeconds(100));
        assertThat(s.hasAccess(end.minusSeconds(1))).isTrue();
    }
    @Test void immediateTerminationRevokesAccess() {
        for (String status:new String[]{"canceled","unpaid","paused","incomplete","incomplete_expired","checkout_pending"})
            assertThat(paid(status).hasAccess(end.minusSeconds(1))).as(status).isFalse();
        var s=paid("active"); s.setEndedAt(end.minusSeconds(10));
        assertThat(s.hasAccess(end.minusSeconds(1))).isFalse();
    }
    @Test void freeAccessEndsAtItsRecordedBoundary() {
        var s=new BillingSubscription();
        s.setLegacyAccess(false); s.setPlan(com.example.demo.base.enums.SubscriptionPlan.FREE);
        s.setStatus("free_active"); s.setPaidUntil(end);
        assertThat(s.hasAccess(end.minusNanos(1))).isTrue();
        assertThat(s.hasAccess(end)).isFalse();
        assertThat(s.hasAccess(end.plusSeconds(1))).isFalse();
    }
    @Test void freeWithoutAnyDateDoesNotGrantUnlimitedAccess() {
        var s=new BillingSubscription();
        s.setLegacyAccess(false); s.setPlan(com.example.demo.base.enums.SubscriptionPlan.FREE);
        s.setStatus("free_active");
        assertThat(s.hasAccess(Instant.now())).isFalse();
    }
    @Test void unpaidNewAccountGetsNoAccessButLegacyIsPreserved() {
        var s=new BillingSubscription(); assertThat(s.hasAccess(Instant.now())).isTrue();
        s.setLegacyAccess(false); assertThat(s.hasAccess(Instant.now())).isFalse();
    }
}
