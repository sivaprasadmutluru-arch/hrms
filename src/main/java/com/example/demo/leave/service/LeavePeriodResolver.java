package com.example.demo.leave.service;

import com.example.demo.leave.entity.LeaveType;
import java.time.LocalDate;
import java.time.YearMonth;

/** Resolves the inclusive accounting period used by a leave type. */
public final class LeavePeriodResolver {
    private LeavePeriodResolver() {}
    public record Period(LocalDate start, LocalDate end) {}

    /** Allocation year is the year in which the leave period starts. */
    public static Period forAllocationYear(LeaveType type, int allocationYear) {
        LocalDate start = periodStart(type, allocationYear);
        return new Period(start, nextPeriodStart(type, start).minusDays(1));
    }

    /** Resolve the period containing the supplied date. */
    public static Period containing(LeaveType type, LocalDate date) {
        if (!isCustomYearly(type)) {
            return new Period(date.withDayOfYear(1), date.withDayOfYear(date.lengthOfYear()));
        }
        LocalDate thisYearStart = periodStart(type, date.getYear());
        LocalDate start = date.isBefore(thisYearStart) ? periodStart(type, date.getYear() - 1) : thisYearStart;
        return new Period(start, nextPeriodStart(type, start).minusDays(1));
    }

    private static boolean isCustomYearly(LeaveType type) {
        return type != null && Boolean.TRUE.equals(type.getReset())
                && "yearly".equalsIgnoreCase(type.getResetBased())
                && type.getResetMonth() != null && type.getResetDay() != null;
    }

    private static LocalDate periodStart(LeaveType type, int year) {
        if (!isCustomYearly(type)) return LocalDate.of(year, 1, 1);
        int month = parseBounded(type.getResetMonth(), 1, 12, 1);
        int lastDay = YearMonth.of(year, month).lengthOfMonth();
        int day = "last day".equalsIgnoreCase(type.getResetDay())
                ? lastDay : parseBounded(type.getResetDay(), 1, lastDay, 1);
        return LocalDate.of(year, month, day);
    }

    private static LocalDate nextPeriodStart(LeaveType type, LocalDate start) {
        return isCustomYearly(type) ? periodStart(type, start.getYear() + 1) : start.plusYears(1);
    }

    private static int parseBounded(String value, int min, int max, int fallback) {
        try { return Math.max(min, Math.min(max, Integer.parseInt(value))); }
        catch (RuntimeException ignored) { return fallback; }
    }
}
