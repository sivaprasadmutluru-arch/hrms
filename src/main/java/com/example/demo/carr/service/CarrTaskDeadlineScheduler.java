package com.example.demo.carr.service;

import com.example.demo.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component @RequiredArgsConstructor @Slf4j
public class CarrTaskDeadlineScheduler {
    private final JdbcTemplate jdbc;
    private final CarrTaskService tasks;
    @Value("${carr.tasks.deadlines-enabled:true}") private boolean enabled;
    private volatile boolean ready;
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @org.springframework.scheduling.annotation.Async
    public void ready() { ready=true;remind(); }
    // Discover provisioned schemas; each call opens a transaction after tenant selection.
    @Scheduled(initialDelay=60000, fixedDelay=3600000)
    public void remind() {
        if(!enabled || !ready) return;
        String previous=TenantContext.getTenant();
        try {
            for(String schema:jdbc.queryForList("SELECT table_schema FROM information_schema.tables WHERE table_name='carr_responsibilities' AND table_type='BASE TABLE'",String.class)) {
                try { TenantContext.setTenant(schema);tasks.remindDeadlines(LocalDate.now()); }
                catch(Exception ex) { log.warn("CARR deadline reminders failed for schema {}: {}",schema,ex.getClass().getSimpleName()); }
            }
        } finally { TenantContext.setTenant(previous); }
    }
}
