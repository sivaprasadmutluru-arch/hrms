package com.example.demo.common.tenant;

public final class TenantContext {
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    public static final String DEFAULT_TENANT = "public";

    private TenantContext() {}

    public static void setTenant(String schema) { CURRENT_TENANT.set(schema); }
    public static String getTenant() {
        String t = CURRENT_TENANT.get();
        return (t != null && !t.isBlank()) ? t : DEFAULT_TENANT;
    }
    public static void clear() { CURRENT_TENANT.remove(); }
}
