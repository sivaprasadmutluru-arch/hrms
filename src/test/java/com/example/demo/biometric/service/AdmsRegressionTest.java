package com.example.demo.biometric.service;

import com.example.demo.biometric.entity.BiometricDevice;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AdmsRegressionTest {
    private final AdmsService service = new AdmsService(null, null, null, null, null, null);
    @Test void breakDirectionsAreNotReversed() {
        String[] expected = {"in", "out", "out", "in", "in", "out"};
        for (int status = 0; status < 6; status++)
            assertEquals(expected[status], ReflectionTestUtils.invokeMethod(service, "resolvePunchDirection", status, BiometricDevice.DeviceDirection.SYSTEM));
    }
    @Test void unknownStatusIsNotInventedAsClockIn() {
        assertNull(ReflectionTestUtils.invokeMethod(service, "resolvePunchDirection", -1, BiometricDevice.DeviceDirection.SYSTEM));
    }
    @Test void absentTerminalMappingNeverFallsBackToAnotherDevice() {
        assertNull(ReflectionTestUtils.invokeMethod(service, "resolveEmployeeMapping", new BiometricDevice(), "34", Map.of()));
    }
    @Test void invalidTimestampFailsBatchRatherThanAcknowledgingLostPunch() {
        assertThrows(IllegalArgumentException.class, () -> ReflectionTestUtils.invokeMethod(service, "parseAttlog", "34\tinvalid\t0"));
    }
    @Test void originalLocalTimeIsPreserved() {
        java.util.List<?> records = ReflectionTestUtils.invokeMethod(service, "parseAttlog", "34\t2026-09-15 12:00:00\t0");
        var record = (AdmsService.PunchRecord) records.get(0);
        assertEquals(java.time.LocalDateTime.of(2026,9,15,12,0), record.punchTime);
        assertEquals(java.time.Instant.parse("2026-09-15T08:00:00Z"), record.punchTime.atZone(java.time.ZoneId.of("Asia/Dubai")).toInstant());
    }
}
