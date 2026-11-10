package com.example.demo.base.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
/** Backfills ready workspaces once; independent from optional development demo data. */
@Component @RequiredArgsConstructor @Slf4j @Order(200)
public class StandardCompanySetupInitializer implements ApplicationRunner {
    private final StandardCompanySetup setup;
    private final JdbcTemplate jdbc;
    @Override public void run(ApplicationArguments args) {
        var ids=jdbc.queryForList("SELECT c.id FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id WHERE c.is_active=true AND coalesce(p.schema_ready,c.schema_ready)=true AND coalesce(c.schema_name,p.schema_name) IS NOT NULL ORDER BY c.id",Long.class);
        for(Long id:ids) {
            try { setup.ensure(id); }
            catch(Exception error) { log.error("Standard department/position initialization failed for company {}",id,error); }
        }
    }
}
