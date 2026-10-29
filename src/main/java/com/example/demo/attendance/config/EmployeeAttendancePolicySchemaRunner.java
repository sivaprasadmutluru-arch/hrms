package com.example.demo.attendance.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;

@Component @Order(4) @RequiredArgsConstructor
public class EmployeeAttendancePolicySchemaRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    @Override @Transactional
    public void run(String... args) throws Exception {
        jdbc.execute(new ClassPathResource("db/migration/R__employee_attendance_policy.sql").getContentAsString(StandardCharsets.UTF_8));
    }
}
