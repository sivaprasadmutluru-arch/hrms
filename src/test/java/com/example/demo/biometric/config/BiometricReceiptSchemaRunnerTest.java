package com.example.demo.biometric.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class BiometricReceiptSchemaRunnerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BiometricReceiptSchemaRunner runner = new BiometricReceiptSchemaRunner(jdbc);
    private static final String COLUMNS = "select column_name from information_schema.columns where table_schema = ? and table_name = 'biometric_punch_receipts'";

    @Test void repairsAllLegacyColumnsWithoutChangingData() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("veracity"));
        when(jdbc.queryForList(COLUMNS, String.class, "veracity")).thenReturn(List.of("devicestatus", "devicetime", "deviceuserid", "employeeid", "processingstate", "serialnumber"));
        runner.run();
        for (String pair : List.of("devicestatus:device_status", "devicetime:device_time", "deviceuserid:device_user_id", "employeeid:employee_id", "processingstate:processing_state", "serialnumber:serial_number")) {
            var names = pair.split(":");
            verify(jdbc).execute("ALTER TABLE \"veracity\".biometric_punch_receipts RENAME COLUMN \"" + names[0] + "\" TO \"" + names[1] + "\"");
        }
    }

    @Test void canonicalSchemasNeedNoAlterations() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("company"));
        when(jdbc.queryForList(COLUMNS, String.class, "company")).thenReturn(List.of("device_status", "device_time"));
        runner.run();
        verify(jdbc, never()).execute(startsWith("ALTER TABLE"));
    }

    @Test void refusesAmbiguousColumnsAndInvalidSchemaNames() {
        when(jdbc.queryForList(COLUMNS, String.class, "public")).thenReturn(List.of("devicestatus", "device_status"));
        assertThrows(IllegalStateException.class, () -> runner.run());
        verify(jdbc, never()).execute(anyString());
        reset(jdbc);
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("bad-schema;"));
        assertThrows(IllegalStateException.class, () -> runner.run());
        verify(jdbc, never()).execute(anyString());
    }
}
