package com.example.demo.base.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Production uses Hibernate validate, so additive public-schema lifecycle columns
 * must be installed explicitly. PostgreSQL's IF NOT EXISTS makes this safe to run
 * on every release and it never mutates existing company data.
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class CompanyArchiveSchemaRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        jdbc.execute("ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_at timestamp");
        jdbc.execute("ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_by varchar(255)");
        jdbc.execute("ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archive_reason text");
    }
}
