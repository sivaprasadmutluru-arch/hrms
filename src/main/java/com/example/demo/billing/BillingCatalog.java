package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import java.util.List;
public final class BillingCatalog {
    private BillingCatalog() {}
    public record Plan(SubscriptionPlan id, String name, long monthlyAmountMinor, long yearlyAmountMinor,
                       Integer maxBranches, Integer maxEmployees, boolean crossBranch) {
        public long amount(BillingCycle cycle) { return cycle==BillingCycle.YEARLY ? yearlyAmountMinor : monthlyAmountMinor; }
        public long totalAmount(BillingCycle cycle) { return Math.round(amount(cycle) * 1.18); }
    }
    public static List<Plan> entries() { return List.of(
        new Plan(SubscriptionPlan.FREE,"Free",0,0,1,15,false),
        new Plan(SubscriptionPlan.BASIC,"Basic",99900,999000,2,50,false),
        new Plan(SubscriptionPlan.STANDARD,"Standard",299900,2999000,5,200,true),
        new Plan(SubscriptionPlan.ENTERPRISE,"Enterprise",699900,6999000,null,null,true)); }
    public static Plan plan(SubscriptionPlan plan) { return entries().stream().filter(p -> p.id()==plan).findFirst().orElseThrow(); }
}
