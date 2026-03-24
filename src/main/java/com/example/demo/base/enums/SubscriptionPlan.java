package com.example.demo.base.enums;

/**
 * Subscription tiers for client organizations on the Prabha Tech platform.
 * Enforced at branch creation, employee creation, and cross-branch access grant.
 */
public enum SubscriptionPlan {

    BASIC(2, 50, false),
    STANDARD(5, 200, true),
    ENTERPRISE(Integer.MAX_VALUE, Integer.MAX_VALUE, true);

    private final int maxBranches;
    private final int maxEmployees;
    private final boolean crossBranchAccessAllowed;

    SubscriptionPlan(int maxBranches, int maxEmployees, boolean crossBranchAccessAllowed) {
        this.maxBranches = maxBranches;
        this.maxEmployees = maxEmployees;
        this.crossBranchAccessAllowed = crossBranchAccessAllowed;
    }

    public int getMaxBranches() { return maxBranches; }
    public int getMaxEmployees() { return maxEmployees; }
    public boolean isCrossBranchAccessAllowed() { return crossBranchAccessAllowed; }

    /** Backwards-compat lookup; returns STANDARD for null/unknown strings. */
    public static SubscriptionPlan getByName(String name) {
        if (name == null) return STANDARD;
        try {
            return valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            return STANDARD;
        }
    }
}
