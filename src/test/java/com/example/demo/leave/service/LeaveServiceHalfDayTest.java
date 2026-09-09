package com.example.demo.leave.service;

import com.example.demo.common.exception.BadRequestException;
import com.example.demo.leave.entity.LeaveRequest;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LeaveServiceHalfDayTest {

    private final LocalDate date = LocalDate.of(2026, 9, 9);

    @Test
    void firstHalfConsumesHalfDay() {
        assertEquals(0.5, LeaveService.resolveRequestedDays(
                1, LeaveRequest.LeaveDuration.FIRST_HALF, date, date));
    }

    @Test
    void secondHalfConsumesHalfDay() {
        assertEquals(0.5, LeaveService.resolveRequestedDays(
                1, LeaveRequest.LeaveDuration.SECOND_HALF, date, date));
    }

    @Test
    void halfDayCannotSpanMultipleDates() {
        assertThrows(BadRequestException.class, () -> LeaveService.resolveRequestedDays(
                2, LeaveRequest.LeaveDuration.FIRST_HALF, date, date.plusDays(1)));
    }

    @Test
    void halfDayCannotBeAppliedOnExcludedDay() {
        assertThrows(BadRequestException.class, () -> LeaveService.resolveRequestedDays(
                0, LeaveRequest.LeaveDuration.SECOND_HALF, date, date));
    }
}
