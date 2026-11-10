package com.example.demo.leave.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Backfill existing workspaces once per catalog; new companies use StandardCompanySetup. */
@Component @Order(4) @RequiredArgsConstructor @Slf4j
public class DefaultLeaveTypeRunner implements CommandLineRunner {
 private final JdbcTemplate jdbc;private final DefaultLeaveTypeService defaults;
 @Override public void run(String... args) {
  for(Long id:jdbc.queryForList("SELECT c.id FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id WHERE c.is_active=true AND c.schema_ready=true AND coalesce(c.schema_name,p.schema_name) IS NOT NULL ORDER BY c.id",Long.class)) {
   try { int count=defaults.ensureInitial(id);if(count>0)log.info("Added {} default leave types for company {}",count,id); }
   catch(Exception e){log.error("Unable to initialize default leave types for company {}",id,e);}
  }
 }
}
