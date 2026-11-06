package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
class BillingNoticePolicyTest {
 final Instant now=Instant.parse("2026-11-02T06:00:00Z");
 BillingSubscription subscription(){var s=new BillingSubscription();s.setPlan(SubscriptionPlan.BASIC);s.setLegacyAccess(false);s.setManualAccess(true);s.setPaidUntil(now.plusSeconds(7*86400));return s;}
 @Test void reminderWindowsUseIstCalendarDays(){for(int days:new int[]{7,3,1,0}){var s=subscription();s.setPaidUntil(now.plusSeconds(days*86400L+3600));assertThat(BillingNoticeDispatcher.due(s,now)).isEqualTo("RENEWAL_"+days+"_DAYS");}var s=subscription();s.setPaidUntil(now.plusSeconds(5*86400));assertThat(BillingNoticeDispatcher.due(s,now)).isNull();}
 @Test void expiredAndPaymentDueHaveExplicitPolicies(){var s=subscription();s.setPaidUntil(now.minusSeconds(1));assertThat(BillingNoticeDispatcher.due(s,now)).isEqualTo("ACCESS_EXPIRED");s.setPaidUntil(now.plusSeconds(86400));s.setStatus("past_due");assertThat(BillingNoticeDispatcher.due(s,now)).isEqualTo("PAYMENT_DUE");}
 @Test void freeLegacyAndRazorpayTestSubscriptionsNeverNotifyRealContacts(){var s=subscription();s.setPlan(SubscriptionPlan.FREE);assertThat(BillingNoticeDispatcher.due(s,now)).isNull();s.setPlan(SubscriptionPlan.BASIC);s.setLegacyAccess(true);assertThat(BillingNoticeDispatcher.due(s,now)).isNull();s.setLegacyAccess(false);s.setManualAccess(false);s.setRazorpaySubscriptionId("sub_test");s.setLiveMode(false);assertThat(BillingNoticeDispatcher.due(s,now)).isNull();s.setLiveMode(true);assertThat(BillingNoticeDispatcher.due(s,now)).isEqualTo("RENEWAL_7_DAYS");}
 @Test void canceledLiveSubscriptionsUseEffectiveAccessEnd(){var s=subscription();s.setManualAccess(false);s.setRazorpaySubscriptionId("sub_live");s.setLiveMode(true);s.setEndedAt(now.minusSeconds(1));assertThat(BillingNoticeDispatcher.due(s,now)).isEqualTo("ACCESS_EXPIRED");}
}
