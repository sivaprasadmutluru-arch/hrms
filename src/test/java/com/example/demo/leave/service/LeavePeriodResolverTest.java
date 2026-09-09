package com.example.demo.leave.service;

import com.example.demo.leave.entity.LeaveType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LeavePeriodResolverTest {

    private LeaveType julyAcademicYear() {
        LeaveType type = new LeaveType();
        type.setReset(true);
        type.setResetBased("yearly");
        type.setResetMonth("7");
        type.setResetDay("1");
        return type;
    }

    @Test
    void allocationYearRunsFromJulyThroughFollowingJune() {
        var period = LeavePeriodResolver.forAllocationYear(julyAcademicYear(), 2026);
        assertEquals(LocalDate.of(2026, 7, 1), period.start());
        assertEquals(LocalDate.of(2027, 6, 30), period.end());
    }

    @Test
    void dateBeforeJulyBelongsToPreviousAcademicYear() {
        var period = LeavePeriodResolver.containing(julyAcademicYear(), LocalDate.of(2027, 6, 30));
        assertEquals(LocalDate.of(2026, 7, 1), period.start());
        assertEquals(LocalDate.of(2027, 6, 30), period.end());
    }

    @Test
    void julyBoundaryStartsNewAcademicYear() {
        var period = LeavePeriodResolver.containing(julyAcademicYear(), LocalDate.of(2027, 7, 1));
        assertEquals(LocalDate.of(2027, 7, 1), period.start());
        assertEquals(LocalDate.of(2028, 6, 30), period.end());
    }

    @Test
    void normalLeaveTypeUsesCalendarYear() {
        var period = LeavePeriodResolver.containing(new LeaveType(), LocalDate.of(2027, 6, 30));
        assertEquals(LocalDate.of(2027, 1, 1), period.start());
        assertEquals(LocalDate.of(2027, 12, 31), period.end());
    }
}
