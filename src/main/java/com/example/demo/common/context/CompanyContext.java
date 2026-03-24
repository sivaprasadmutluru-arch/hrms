package com.example.demo.common.context;

public class CompanyContext {

    private static final ThreadLocal<Long> CURRENT_COMPANY = new ThreadLocal<>();

    private CompanyContext() {}

    public static void set(Long companyId) {
        CURRENT_COMPANY.set(companyId);
    }

    public static Long get() {
        return CURRENT_COMPANY.get();
    }

    public static void clear() {
        CURRENT_COMPANY.remove();
    }
}
