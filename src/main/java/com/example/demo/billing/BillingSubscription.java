package com.example.demo.billing;

import com.example.demo.base.enums.SubscriptionPlan;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name="billing_subscriptions", schema="public") @Getter @Setter
public class BillingSubscription {
    @Id @Column(name="organization_id") private Long organizationId;
    @Version @Column(name="version") private long version;
    @Enumerated(EnumType.STRING) @Column(name="plan") private SubscriptionPlan plan;
    @Enumerated(EnumType.STRING) @Column(name="cycle") private BillingCycle cycle;
    @Column(name="seat_count") private Integer seatCount;
    @Column(name="checkout_seats") private Integer checkoutSeats;
    @Column(name="status") private String status = "LEGACY";
    @Column(name="legacy_access") private boolean legacyAccess = true;
    @Column(name="manual_access") private boolean manualAccess;
    @Column(name="razorpay_subscription_id",unique=true) private String razorpaySubscriptionId;
    @Column(name="razorpay_plan_id") private String razorpayPlanId;
    // Historical provider columns remain for records created before the migration.
    @Column(name="stripe_customer_id",unique=true) private String stripeCustomerId;
    @Column(name="stripe_subscription_id",unique=true) private String stripeSubscriptionId;
    @Column(name="stripe_price_id") private String stripePriceId;
    @Column(name="checkout_session_id") private String checkoutSessionId;
    @Column(name="checkout_url",length=2048) private String checkoutUrl;
    @Column(name="checkout_expires_at") private Instant checkoutExpiresAt;
    @Column(name="checkout_generation") private long checkoutGeneration;
    @Column(name="checkout_price_id") private String checkoutPriceId;
    @Column(name="started_at") private Instant startedAt;
    @Column(name="period_start") private Instant periodStart;
    @Column(name="period_end") private Instant periodEnd;
    @Column(name="paid_until") private Instant paidUntil;
    @Column(name="canceled_at") private Instant canceledAt;
    @Column(name="ended_at") private Instant endedAt;
    @Column(name="cancel_at_period_end") private boolean cancelAtPeriodEnd;
    @Column(name="amount_minor") private Long amountMinor;
    @Column(name="currency") private String currency = "inr";
    @Column(name="synced_at") private Instant syncedAt;
    @Column(name="sync_error") private String syncError;
    @Column(name="live_mode") private boolean liveMode;

    public boolean hasAccess(Instant now) {
        if (legacyAccess) return true;
        if (plan == SubscriptionPlan.FREE) {
            // Free plan is Free Forever for micro teams & early startups (up to 15 employees, 1 branch)
            return "free_active".equals(status) && endedAt == null;
        }
        if (manualAccess) return paidUntil != null && now.isBefore(paidUntil);
        return paidUntil != null && now.isBefore(paidUntil)
                && (endedAt == null || now.isBefore(endedAt))
                && java.util.Set.of("active","pending","halted","past_due","completed","cancelled").contains(status);
    }
}
