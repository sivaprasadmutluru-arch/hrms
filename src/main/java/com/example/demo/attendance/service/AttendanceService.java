package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.AttendanceCalendarDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterResponse;
import com.example.demo.attendance.dto.AttendanceRegisterRowDto;
import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceActivity;
import com.example.demo.attendance.entity.AttendanceLateComeEarlyOut;
import com.example.demo.attendance.entity.AttendanceOverTime;
import com.example.demo.attendance.entity.WorkRecord;
import com.example.demo.attendance.repository.*;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.base.repository.WorkTypeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.Holiday;
import com.example.demo.leave.entity.HolidayAllocation;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.HolidayAllocationRepository;
import com.example.demo.leave.repository.HolidayRepository;
import com.example.demo.leave.repository.LeaveRequestRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private static final java.time.ZoneId DUBAI_ZONE = java.time.ZoneId.of("Asia/Dubai");

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final AttendanceLateComeEarlyOutRepository lateComeEarlyOutRepository;
    private final AttendanceOverTimeRepository overtimeRepository;
    private final GraceTimeRepository graceTimeRepository;
    private final WorkRecordRepository workRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final HolidayAllocationRepository holidayAllocationRepository;
    private final AttendanceValidationConditionRepository validationConditionRepository;

    private final AttendanceActivityRepository attendanceActivityRepository;

    /**
     * ENTERPRISE_ADMIN → sees attendance across all branches.
     * BRANCH_ADMIN → sees attendance only in their branch.
     * DEPARTMENT_MANAGER → sees only their department employees' attendance.
     * EMPLOYEE (SELF scope) → sees only their own attendance records.
     */
    @Transactional(readOnly = true)
    public Page<AttendanceResponse> getAll(Pageable pageable, String status, LocalDate from, LocalDate to, Long departmentId) {
        // NOTE: byEmployeeDepartment() honors the X-Filter-Company-Id header (topbar branch
        // switcher) centrally via ScopeFilter.applyBranchFilter.
        Specification<Attendance> spec = ScopeFilter.byEmployeeDepartment();

        if (status != null && !status.isBlank()) {
            Specification<Attendance> statusSpec = (root, query, cb) ->
                    cb.equal(cb.upper(root.get("attendanceValidated").as(String.class)), status.toUpperCase());
            spec = spec != null ? spec.and(statusSpec) : statusSpec;
        }
        if (from != null) {
            Specification<Attendance> fromSpec = (root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("attendanceDate"), from);
            spec = spec != null ? spec.and(fromSpec) : fromSpec;
        }
        if (to != null) {
            Specification<Attendance> toSpec = (root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("attendanceDate"), to);
            spec = spec != null ? spec.and(toSpec) : toSpec;
        }
        if (departmentId != null) {
            Specification<Attendance> deptSpec = (root, query, cb) ->
                    cb.equal(root.get("employee").get("department").get("id"), departmentId);
            spec = spec != null ? spec.and(deptSpec) : deptSpec;
        }
        Page<Attendance> page = spec != null
                ? attendanceRepository.findAll(spec, pageable)
                : attendanceRepository.findAll(pageable);
        return page.map(AttendanceResponse::from);
    }

    @Transactional(readOnly = true)
    public AttendanceResponse getById(Long id) {
        return AttendanceResponse.from(find(id));
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> getByEmployee(Long employeeId) {
        return attendanceRepository.findByEmployeeId(employeeId)
                .stream().map(AttendanceResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public AttendanceResponse create(AttendanceRequest req) {
        // Upsert: if a record already exists for this employee+date, update it instead of creating a duplicate
        Attendance att = attendanceRepository
                .findByEmployeeIdAndAttendanceDate(req.getEmployeeId(), req.getAttendanceDate())
                .orElse(new Attendance());
        att = attendanceRepository.save(buildAttendance(att, req));

        // Auto-compute worked hours when checkout is present
        if (att.getCheckOut() != null) {
            autoComputeOnCheckout(att);
        }

        return AttendanceResponse.from(att);
    }

    @Transactional
    public AttendanceResponse update(Long id, AttendanceRequest req) {
        Attendance att = buildAttendance(find(id), req);
        att = attendanceRepository.save(att);

        // Auto-compute worked hours and detect late/early when checkout is present
        if (att.getCheckOut() != null) {
            autoComputeOnCheckout(att);
        }

        return AttendanceResponse.from(att);
    }

    /** Parse HH:MM string to total minutes, returns null if blank/invalid. */
    private Integer parseHhmm(String hhmm) {
        if (hhmm == null || hhmm.isBlank()) return null;
        String[] parts = hhmm.split(":");
        if (parts.length < 2) return null;
        try {
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void autoComputeOnCheckout(Attendance att) {
        recalculateTotalHours(att);
        double worked = att.getWorkedHour() != null ? att.getWorkedHour() : 0.0;

        if (att.getMinimumHour() != null && worked > att.getMinimumHour()) {
            double rawOt = Math.round((worked - att.getMinimumHour()) * 100.0) / 100.0;

            // Resolve shift-level values, fall back to company-level ValidationCondition
            ShiftSchedule shift = att.getShift();
            String cutoffStr = shift != null ? shift.getOvertimeCutoff() : null;
            String minOtStr  = shift != null ? shift.getMinimumOvertimeToApprove() : null;

            if (att.getCompany() != null && ((cutoffStr == null || cutoffStr.isBlank()) || (minOtStr == null || minOtStr.isBlank()))) {
                var vc = validationConditionRepository.findByCompanyId(att.getCompany().getId()).orElse(null);
                if (vc != null) {
                    if (cutoffStr == null || cutoffStr.isBlank()) cutoffStr = vc.getOvertimeCutoff();
                    if (minOtStr  == null || minOtStr.isBlank())  minOtStr  = vc.getMinimumOvertimeToApprove();
                }
            }

            // Apply minimumOvertimeToApprove: discard OT below the threshold
            Integer minOtMinutes = parseHhmm(minOtStr);
            if (minOtMinutes != null && rawOt * 60 < minOtMinutes) {
                rawOt = 0.0;
            }

            // Apply overtimeCutoff: cap at maximum allowed
            Integer cutoffMinutes = parseHhmm(cutoffStr);
            if (cutoffMinutes != null) {
                rawOt = Math.min(rawOt, cutoffMinutes / 60.0);
            }

            att.setAttendanceOvertime(Math.round(rawOt * 100.0) / 100.0);
            att.setOvertimeSecond((int)(rawOt * 3600));
        } else {
            att.setOvertimeSecond(0);
        }
        attendanceRepository.save(att);

        // Auto-generate WorkRecord for payroll based on actual hours vs shift minimum
        generateWorkRecord(att, worked);

        // Detect late/early: check branch-level grace first, then fall back to org-level
        int graceMinutes = 0;
        if (att.getCompany() != null) {
            Long companyId = att.getCompany().getId();
            graceMinutes = graceTimeRepository
                    .findFirstByCompanyIdAndIsDefaultTrue(companyId)
                    .map(g -> g.getAllowedTimeInSeconds() != null ? (int) Math.round(g.getAllowedTimeInSeconds() / 60.0) : 0)
                    .orElseGet(() -> {
                        Organization org = att.getCompany().getOrganization();
                        if (org == null) return 0;
                        return graceTimeRepository
                                .findFirstByOrganizationIdAndIsDefaultTrue(org.getId())
                                .map(g -> g.getAllowedTimeInSeconds() != null ? (int) Math.round(g.getAllowedTimeInSeconds() / 60.0) : 0)
                                .orElse(0);
                    });
        }
        detectLateComeEarlyOut(att.getId(), graceMinutes);
    }

    private void recalculateTotalHours(Attendance att) {
        if (att.getCheckIn() == null || att.getCheckOut() == null) {
            att.setWorkedHour(0.0);
            att.setAtWorkSecond(0);
            return;
        }

        List<AttendanceActivity> activities = attendanceActivityRepository.findByEmployeeIdAndAttendanceDate(
                att.getEmployee().getId(), att.getAttendanceDate());

        long totalSeconds = 0;
        boolean calculateFromActivities = false;

        if (!activities.isEmpty()) {
            LocalTime minIn = null;
            LocalTime maxOut = null;
            for (AttendanceActivity a : activities) {
                if (a.getClockIn() != null) {
                    if (minIn == null || a.getClockIn().isBefore(minIn)) minIn = a.getClockIn();
                }
                if (a.getClockOut() != null) {
                    if (maxOut == null || a.getClockOut().isAfter(maxOut)) maxOut = a.getClockOut();
                }
            }

            // If the Attendance checkIn/checkOut exactly match the bounds of activities,
            // we assume it has NOT been manually overridden, so we calculate from activities (deducting breaks).
            if (minIn != null && maxOut != null &&
                att.getCheckIn().equals(minIn) && att.getCheckOut().equals(maxOut)) {
                calculateFromActivities = true;
            }
        }

        if (calculateFromActivities) {
            for (AttendanceActivity a : activities) {
                if (a.getClockIn() != null && a.getClockOut() != null) {
                    LocalTime in = a.getClockIn();
                    LocalTime out = a.getClockOut();
                    long seconds;
                    if (out.isBefore(in)) {
                        seconds = ChronoUnit.SECONDS.between(in, LocalTime.MAX) + 1
                                + ChronoUnit.SECONDS.between(LocalTime.MIN, out);
                    } else {
                        seconds = ChronoUnit.SECONDS.between(in, out);
                    }
                    totalSeconds += seconds;
                }
            }
        } else {
            // Calculate strictly from checkIn to checkOut
            LocalTime in = att.getCheckIn();
            LocalTime out = att.getCheckOut();
            if (out.isBefore(in)) {
                totalSeconds = ChronoUnit.SECONDS.between(in, LocalTime.MAX) + 1
                        + ChronoUnit.SECONDS.between(LocalTime.MIN, out);
            } else {
                totalSeconds = ChronoUnit.SECONDS.between(in, out);
            }
        }

        double workedHours = Math.round((totalSeconds / 3600.0) * 100.0) / 100.0;
        att.setWorkedHour(workedHours);
        att.setAtWorkSecond((int) totalSeconds);
    }

    /**
     * Auto-generate or update a WorkRecord from a completed attendance.
     * Classification: FDP (>= minHours), HDP (>= half minHours), or proportional HDP.
     * minimumWorkingHour on ShiftSchedule is stored in minutes (e.g. 480 = 8h).
     */
    private void generatePunchWorkRecord(AttendanceActivity activity, Attendance summary) {
        if (activity.getClockIn() == null || activity.getClockOut() == null) return;

        LocalTime in = activity.getClockIn();
        LocalTime out = activity.getClockOut();
        long seconds;
        if (out.isBefore(in)) {
            seconds = ChronoUnit.SECONDS.between(in, LocalTime.MAX) + 1
                    + ChronoUnit.SECONDS.between(LocalTime.MIN, out);
        } else {
            seconds = ChronoUnit.SECONDS.between(in, out);
        }

        double workedHours = Math.round((seconds / 3600.0) * 100.0) / 100.0;
        int wh = (int) workedHours;
        int wm = (int) Math.round((workedHours - wh) * 60);
        String atWorkStr = String.format("%02d:%02d", wh, wm);

        java.time.format.DateTimeFormatter timeFormatter = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss");

        WorkRecord wr = new WorkRecord();
        wr.setEmployee(activity.getEmployee());
        wr.setCompany(summary.getCompany());
        wr.setAttendance(summary);
        wr.setDate(activity.getAttendanceDate());
        wr.setWorkRecordType(WorkRecord.WorkRecordType.FDP);
        wr.setAtWorkSecond((int) seconds);
        wr.setAtWork(atWorkStr);
        wr.setIsAttendanceRecord(false);
        wr.setNote("Punch: " + in.format(timeFormatter) + " - " + out.format(timeFormatter));
        wr.setLastUpdate(java.time.LocalDateTime.now(DUBAI_ZONE));
        workRecordRepository.save(wr);
    }

    private void generateWorkRecord(Attendance att, double workedHours) {
        if (att.getEmployee() == null || att.getAttendanceDate() == null) return;

        int atWorkSeconds = (int) (workedHours * 3600);
        int wh = (int) workedHours;
        int wm = (int) Math.round((workedHours - wh) * 60);
        String atWorkStr = String.format("%02d:%02d", wh, wm);

        WorkRecord.WorkRecordType type;
        double dayPercentage;
        int minHourSeconds = 0;
        String minHourStr = "00:00";

        ShiftSchedule shift = att.getShift();
        if (shift != null && shift.getMinimumWorkingHour() != null) {
            int minMinutes = shift.getMinimumWorkingHour(); // stored in minutes
            minHourSeconds = minMinutes * 60;
            minHourStr = String.format("%02d:%02d", minMinutes / 60, minMinutes % 60);
            double minHours = minMinutes / 60.0;

            if (workedHours >= minHours) {
                type = WorkRecord.WorkRecordType.FDP;
                dayPercentage = 1.0;
            } else if (workedHours >= minHours / 2.0) {
                type = WorkRecord.WorkRecordType.HDP;
                dayPercentage = 0.5;
            } else {
                // FIX #9: less than half minimum hours = Absent, not Half Day
                type = WorkRecord.WorkRecordType.ABS;
                dayPercentage = 0.0;
            }
        } else {
            // No shift assigned — treat any time worked as a full day
            type = WorkRecord.WorkRecordType.FDP;
            dayPercentage = 1.0;
        }

        // Upsert: update existing attendance-based WorkRecord for this date if present
        List<WorkRecord> existing = workRecordRepository
                .findByEmployeeIdAndDate(att.getEmployee().getId(), att.getAttendanceDate());
        WorkRecord wr = existing.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsAttendanceRecord()))
                .findFirst()
                .orElseGet(WorkRecord::new);

        wr.setEmployee(att.getEmployee());
        wr.setCompany(att.getCompany());
        wr.setAttendance(att);
        wr.setDate(att.getAttendanceDate());
        wr.setWorkRecordType(type);
        wr.setAtWorkSecond(atWorkSeconds);
        wr.setMinHourSecond(minHourSeconds);
        wr.setAtWork(atWorkStr);
        wr.setMinHour(minHourStr);
        wr.setDayPercentage(dayPercentage);
        wr.setIsAttendanceRecord(true);
        wr.setLastUpdate(java.time.LocalDateTime.now(DUBAI_ZONE));
        workRecordRepository.save(wr);
    }

    @Transactional
    public AttendanceResponse approve(Long id) {
        Attendance att = find(id);
        att.setAttendanceValidated(Attendance.AttendanceStatus.APPROVED);
        att.setIsValidateRequestApproved(true);
        return AttendanceResponse.from(attendanceRepository.save(att));
    }

    @Transactional
    public AttendanceResponse reject(Long id) {
        Attendance att = find(id);
        att.setAttendanceValidated(Attendance.AttendanceStatus.REJECTED);
        att.setIsValidateRequest(false);
        return AttendanceResponse.from(attendanceRepository.save(att));
    }

    @Transactional
    public void delete(Long id) {
        Attendance att = find(id);
        att.setActive(false);
        attendanceRepository.save(att);
    }

    private Attendance find(Long id) {
        return attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", id));
    }

    // ─── Business Logic ───────────────────────────────────────────────────────

    /**
     * Compute worked hours from checkIn/checkOut and store on the attendance record.
     * Handles overnight shifts (checkOut < checkIn).
     */
    @Transactional
    public AttendanceResponse computeWorkedHours(Long attendanceId) {
        Attendance att = find(attendanceId);
        if (att.getCheckIn() != null && att.getCheckOut() != null) {
            LocalTime in = att.getCheckIn();
            LocalTime out = att.getCheckOut();
            long minutes;
            if (out.isBefore(in)) {
                // overnight shift: 24h - (in - out)
                minutes = ChronoUnit.MINUTES.between(in, LocalTime.MAX) + 1
                        + ChronoUnit.MINUTES.between(LocalTime.MIN, out);
            } else {
                minutes = ChronoUnit.MINUTES.between(in, out);
            }
            double worked = Math.round((minutes / 60.0) * 100.0) / 100.0;
            att.setWorkedHour(worked);
            att.setAtWorkSecond((int)(minutes * 60L));

            // FIX #13: apply same cutoff/minimum OT rules as autoComputeOnCheckout
            if (att.getMinimumHour() != null && worked > att.getMinimumHour()) {
                double rawOt = Math.round((worked - att.getMinimumHour()) * 100.0) / 100.0;

                ShiftSchedule shift = att.getShift();
                String cutoffStr = shift != null ? shift.getOvertimeCutoff() : null;
                String minOtStr  = shift != null ? shift.getMinimumOvertimeToApprove() : null;

                if (att.getCompany() != null && ((cutoffStr == null || cutoffStr.isBlank()) || (minOtStr == null || minOtStr.isBlank()))) {
                    var vc = validationConditionRepository.findByCompanyId(att.getCompany().getId()).orElse(null);
                    if (vc != null) {
                        if (cutoffStr == null || cutoffStr.isBlank()) cutoffStr = vc.getOvertimeCutoff();
                        if (minOtStr  == null || minOtStr.isBlank())  minOtStr  = vc.getMinimumOvertimeToApprove();
                    }
                }

                Integer minOtMinutes = parseHhmm(minOtStr);
                if (minOtMinutes != null && rawOt * 60 < minOtMinutes) {
                    rawOt = 0.0;
                }

                Integer cutoffMinutes = parseHhmm(cutoffStr);
                if (cutoffMinutes != null) {
                    rawOt = Math.min(rawOt, cutoffMinutes / 60.0);
                }

                att.setAttendanceOvertime(Math.round(rawOt * 100.0) / 100.0);
                att.setOvertimeSecond((int)(rawOt * 3600));
            } else {
                att.setOvertimeSecond(0);
            }
        }
        return AttendanceResponse.from(attendanceRepository.save(att));
    }

    /**
     * Detect late-come / early-out for an attendance record based on its shift schedule.
     * Creates AttendanceLateComeEarlyOut records when thresholds are exceeded.
     * Default grace: 0 minutes (no grace). Caller can pass graceMinutes from TrackLateComeEarlyOut settings.
     */
    @Transactional
    public void detectLateComeEarlyOut(Long attendanceId, int graceMinutes) {
        Attendance att = find(attendanceId);
        ShiftSchedule shift = att.getShift();
        if (shift == null || att.getCheckIn() == null) return;

        // Late come
        if (shift.getStartTime() != null) {
            long lateMinutes = ChronoUnit.MINUTES.between(shift.getStartTime(), att.getCheckIn());
            if (lateMinutes > graceMinutes) {
                // FIX #2: compute net late seconds (after grace) and store on the entity
                int netLateSeconds = (int)((lateMinutes - graceMinutes) * 60L);
                int lh = netLateSeconds / 3600;
                int lm = (netLateSeconds % 3600) / 60;

                List<AttendanceLateComeEarlyOut> existing = lateComeEarlyOutRepository.findByAttendanceId(attendanceId);
                AttendanceLateComeEarlyOut late = existing.stream()
                        .filter(e -> e.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME)
                        .findFirst()
                        .orElseGet(AttendanceLateComeEarlyOut::new);
                late.setAttendance(att);
                late.setEmployee(att.getEmployee());
                late.setType(AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                late.setLateComeSecond(netLateSeconds);
                late.setLateCome(String.format("%02d:%02d", lh, lm));
                lateComeEarlyOutRepository.save(late);
            }
        }

        // Early out
        if (shift.getEndTime() != null && att.getCheckOut() != null) {
            long earlyMinutes = ChronoUnit.MINUTES.between(att.getCheckOut(), shift.getEndTime());
            if (earlyMinutes > graceMinutes) {
                // FIX #2: compute net early seconds (after grace) and store on the entity
                int netEarlySeconds = (int)((earlyMinutes - graceMinutes) * 60L);
                int eh = netEarlySeconds / 3600;
                int em = (netEarlySeconds % 3600) / 60;

                List<AttendanceLateComeEarlyOut> existing = lateComeEarlyOutRepository.findByAttendanceId(attendanceId);
                AttendanceLateComeEarlyOut early = existing.stream()
                        .filter(e -> e.getType() == AttendanceLateComeEarlyOut.EntryType.EARLY_OUT)
                        .findFirst()
                        .orElseGet(AttendanceLateComeEarlyOut::new);
                early.setAttendance(att);
                early.setEmployee(att.getEmployee());
                early.setType(AttendanceLateComeEarlyOut.EntryType.EARLY_OUT);
                early.setEarlyOutSecond(netEarlySeconds);
                early.setEarlyOut(String.format("%02d:%02d", eh, em));
                lateComeEarlyOutRepository.save(early);
            }
        }
    }

    /**
     * Aggregate overtime hours for an employee for a given month/year.
     * Sums attendanceOvertime from all attendance records in that period.
     */
    @Transactional
    public AttendanceOverTime computeMonthlyOvertime(Long employeeId, Long companyId, int month, int year) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());

        List<Attendance> records = attendanceRepository.findByEmployeeIdAndAttendanceDateBetween(employeeId, from, to);
        double totalOvertime = records.stream()
                .filter(a -> a.getAttendanceOvertime() != null)
                .mapToDouble(Attendance::getAttendanceOvertime)
                .sum();

        String monthLabel = from.getMonth().name();
        AttendanceOverTime ot = overtimeRepository
                .findByEmployeeIdAndMonthAndYear(employeeId, monthLabel, year)
                .orElseGet(() -> {
                    AttendanceOverTime n = new AttendanceOverTime();
                    n.setEmployee(employeeRepository.getReferenceById(employeeId));
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    n.setMonth(monthLabel);
                    n.setYear(year);
                    n.setStatus(AttendanceOverTime.OvertimeStatus.PENDING);
                    return n;
                });
        ot.setOvertimeHours(totalOvertime);
        return overtimeRepository.save(ot);
    }

    /**
     * Approve an overtime record and propagate the approval flag to each individual
     * Attendance record in that employee's month so payroll queries pick it up correctly.
     */
    @Transactional
    public AttendanceOverTime approveOvertime(Long overtimeId) {
        AttendanceOverTime ot = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceOverTime", overtimeId));
        ot.setStatus(AttendanceOverTime.OvertimeStatus.APPROVED);
        AttendanceOverTime saved = overtimeRepository.save(ot);

        // FIX #1: propagate approval to individual attendance records
        if (ot.getEmployee() != null && ot.getMonth() != null && ot.getYear() != null) {
            try {
                int monthNum = java.time.Month.valueOf(ot.getMonth().toUpperCase()).getValue();
                List<Attendance> monthAttendances = attendanceRepository
                        .findByEmployeeIdAndYearAndMonth(ot.getEmployee().getId(), ot.getYear(), monthNum);
                for (Attendance a : monthAttendances) {
                    if (a.getOvertimeSecond() != null && a.getOvertimeSecond() > 0) {
                        a.setAttendanceOvertimeApprove(true);
                        a.setApprovedOvertimeSecond(a.getOvertimeSecond());
                        attendanceRepository.save(a);
                    }
                }
            } catch (IllegalArgumentException ignored) {
                log.warn("Invalid month name '{}' on AttendanceOverTime id={}", ot.getMonth(), overtimeId);
            }
        }
        return saved;
    }

    /**
     * Reject an overtime record and clear the approval flag from individual Attendance records.
     */
    @Transactional
    public AttendanceOverTime rejectOvertime(Long overtimeId) {
        AttendanceOverTime ot = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceOverTime", overtimeId));
        ot.setStatus(AttendanceOverTime.OvertimeStatus.REJECTED);
        AttendanceOverTime saved = overtimeRepository.save(ot);

        // FIX #1: clear approval from individual attendance records
        if (ot.getEmployee() != null && ot.getMonth() != null && ot.getYear() != null) {
            try {
                int monthNum = java.time.Month.valueOf(ot.getMonth().toUpperCase()).getValue();
                List<Attendance> monthAttendances = attendanceRepository
                        .findByEmployeeIdAndYearAndMonth(ot.getEmployee().getId(), ot.getYear(), monthNum);
                for (Attendance a : monthAttendances) {
                    a.setAttendanceOvertimeApprove(false);
                    a.setApprovedOvertimeSecond(0);
                    attendanceRepository.save(a);
                }
            } catch (IllegalArgumentException ignored) {
                log.warn("Invalid month name '{}' on AttendanceOverTime id={}", ot.getMonth(), overtimeId);
            }
        }
        return saved;
    }

    /**
     * List overtime records for a company.
     */
    @Transactional(readOnly = true)
    public List<AttendanceOverTime> listOvertime(Long companyId) {
        return overtimeRepository.findByCompanyId(companyId);
    }

    @Transactional(readOnly = true)
    public List<AttendanceCalendarDayDto> getCalendar(int year, int month, Long employeeId) {
        Long resolvedEmployeeId = employeeId;
        Long resolvedCompanyId = null;

        if (resolvedEmployeeId == null) {
            AccessScopeContext.ScopeData scope = AccessScopeContext.get();
            if (scope != null && scope.getUserId() != null) {
                Employee emp = employeeRepository.findByUserId(scope.getUserId()).orElse(null);
                if (emp != null) {
                    resolvedEmployeeId = emp.getId();
                    if (emp.getCompany() != null) resolvedCompanyId = emp.getCompany().getId();
                }
            }
        } else {
            Employee emp = employeeRepository.findById(resolvedEmployeeId).orElse(null);
            if (emp != null && emp.getCompany() != null) resolvedCompanyId = emp.getCompany().getId();
        }

        if (resolvedEmployeeId == null) return Collections.emptyList();

        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate today = LocalDate.now(DUBAI_ZONE);

        // Attendance records for the month
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndAttendanceDateBetween(resolvedEmployeeId, first, last);
        Map<LocalDate, Attendance> attendanceMap = attendances.stream()
                .collect(Collectors.toMap(Attendance::getAttendanceDate, a -> a));

        // Late/early records
        List<AttendanceLateComeEarlyOut> lateEarlyList =
                lateComeEarlyOutRepository.findByEmployeeId(resolvedEmployeeId);
        Map<Long, List<AttendanceLateComeEarlyOut>> lateEarlyByAttendance = lateEarlyList.stream()
                .collect(Collectors.groupingBy(le -> le.getAttendance().getId()));

        // Approved leaves that overlap with this month
        List<LeaveRequest> approvedLeaves = leaveRequestRepository
                .findByEmployeeIdAndStatus(resolvedEmployeeId, LeaveRequest.LeaveStatus.APPROVED);
        // Build a map of date → leaveTypeName for quick lookup
        Map<LocalDate, String> leaveDayMap = new HashMap<>();
        for (LeaveRequest lr : approvedLeaves) {
            if (lr.getStartDate() == null || lr.getEndDate() == null) continue;
            LocalDate lStart = lr.getStartDate().isBefore(first) ? first : lr.getStartDate();
            LocalDate lEnd = lr.getEndDate().isAfter(last) ? last : lr.getEndDate();
            String typeName = lr.getLeaveType() != null ? lr.getLeaveType().getName() : "Leave";
            for (LocalDate d = lStart; !d.isAfter(lEnd); d = d.plusDays(1)) {
                leaveDayMap.put(d, typeName);
            }
        }

        // Holidays for the company this month (company-wide + allocated)
        Map<LocalDate, String> holidayMap = new HashMap<>();
        if (resolvedCompanyId != null) {
            List<Holiday> holidays = holidayRepository.findByCompanyIdAndDateRange(resolvedCompanyId, first, last);
            for (Holiday h : holidays) {
                if (h.getStartDate() == null) continue;
                LocalDate hEnd = h.getEndDate() != null ? h.getEndDate() : h.getStartDate();
                LocalDate hStart = h.getStartDate().isBefore(first) ? first : h.getStartDate();
                hEnd = hEnd.isAfter(last) ? last : hEnd;
                for (LocalDate d = hStart; !d.isAfter(hEnd); d = d.plusDays(1)) {
                    holidayMap.put(d, h.getName() != null ? h.getName() : "Holiday");
                }
            }
            // Merge allocated holidays (employee-specific or department-specific)
            Employee calEmp = employeeRepository.findById(resolvedEmployeeId).orElse(null);
            Long deptId = (calEmp != null && calEmp.getDepartment() != null) ? calEmp.getDepartment().getId() : null;
            List<HolidayAllocation> allocations = deptId != null
                    ? holidayAllocationRepository.findApplicableForEmployee(resolvedCompanyId, resolvedEmployeeId, deptId)
                    : holidayAllocationRepository.findByEmployeeId(resolvedEmployeeId);
            for (HolidayAllocation ha : allocations) {
                Holiday h = ha.getHoliday();
                if (h.getStartDate() == null) continue;
                LocalDate hEnd = h.getEndDate() != null ? h.getEndDate() : h.getStartDate();
                LocalDate hStart = h.getStartDate().isBefore(first) ? first : h.getStartDate();
                hEnd = hEnd.isAfter(last) ? last : hEnd;
                for (LocalDate d = hStart; !d.isAfter(hEnd); d = d.plusDays(1)) {
                    holidayMap.put(d, h.getName() != null ? h.getName() : "Holiday");
                }
            }
        }

        List<AttendanceCalendarDayDto> days = new ArrayList<>();
        LocalDate cur = first;
        while (!cur.isAfter(last)) {
            AttendanceCalendarDayDto dto = new AttendanceCalendarDayDto();
            dto.setDate(cur);
            dto.setDateName(cur.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
            dto.setTypes(Collections.emptyList());

            // Future date
            if (cur.isAfter(today)) {
                dto.setStatus("future");
                dto.setRowClass("gray");
                dto.setDayType("future");
                days.add(dto);
                cur = cur.plusDays(1);
                continue;
            }

            // Public holiday takes highest precedence
            if (holidayMap.containsKey(cur)) {
                dto.setStatus("holiday");
                dto.setRowClass("gray");
                dto.setDayType("holiday");
                dto.setHolidayName(holidayMap.get(cur));
                days.add(dto);
                cur = cur.plusDays(1);
                continue;
            }

            // Weekend (Sat/Sun) with no attendance record → Weekly Off
            boolean isWeekend = cur.getDayOfWeek().getValue() >= 6; // 6=SAT, 7=SUN

            Attendance att = attendanceMap.get(cur);

            if (att == null) {
                if (leaveDayMap.containsKey(cur)) {
                    dto.setStatus("on_leave");
                    dto.setRowClass("gray");
                    dto.setDayType("on_leave");
                    dto.setLeaveTypeName(leaveDayMap.get(cur));
                } else if (isWeekend) {
                    dto.setStatus("weekly_off");
                    dto.setRowClass("gray");
                    dto.setDayType("weekly_off");
                } else {
                    dto.setStatus("absent");
                    dto.setRowClass("orange");
                    dto.setDayType("absent");
                }
            } else {
                dto.setAttendanceId(att.getId());
                dto.setCheckIn(att.getCheckIn());
                dto.setCheckInDate(att.getCheckInDate());
                dto.setCheckOut(att.getCheckOut());
                dto.setCheckOutDate(att.getCheckOutDate());
                dto.setCheckInUtc(att.getCheckInUtc());
                dto.setCheckOutUtc(att.getCheckOutUtc());
                dto.setMinimumHour(att.getMinimumHour());
                dto.setWorkedHour(att.getWorkedHour());
                if (att.getShift() != null) dto.setShiftName(att.getShift().getName());
                if (att.getWorkType() != null) dto.setWorkTypeName(att.getWorkType().getName());
                if (att.getAttendanceOvertime() != null && att.getAttendanceOvertime() > 0)
                    dto.setOvertime(att.getAttendanceOvertime());
                if (att.getMinimumHour() != null && att.getWorkedHour() != null) {
                    double pending = att.getMinimumHour() - att.getWorkedHour();
                    dto.setPendingHour(pending > 0 ? pending : 0.0);
                }

                List<AttendanceLateComeEarlyOut> les =
                        lateEarlyByAttendance.getOrDefault(att.getId(), Collections.emptyList());
                dto.setTypes(les.stream().map(le -> le.getType().name()).collect(Collectors.toList()));
                dto.setPenalties(les.size());

                // Determine status & dayType
                if (Boolean.TRUE.equals(att.getIsValidateRequestApproved())) {
                    dto.setStatus("approved"); dto.setRowClass("blue"); dto.setDayType("present");
                } else if (Boolean.TRUE.equals(att.getIsValidateRequest())) {
                    dto.setStatus("requested"); dto.setRowClass("orange"); dto.setDayType("irregular");
                } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.APPROVED) {
                    dto.setStatus("on_time"); dto.setRowClass("green"); dto.setDayType("present");
                } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.REJECTED) {
                    dto.setStatus("rejected"); dto.setRowClass("red"); dto.setDayType("absent");
                } else {
                    // Has record but not validated — irregular
                    boolean hasIssues = !les.isEmpty();
                    dto.setStatus("not_regularized");
                    dto.setRowClass(hasIssues ? "orange" : "green");
                    dto.setDayType(hasIssues ? "irregular" : "present");
                }
            }

            days.add(dto);
            cur = cur.plusDays(1);
        }
        return days;
    }

    // ─── Clock In / Out ───────────────────────────────────────────────────────

    @Transactional
    public AttendanceResponse clockIn(Long employeeId, Long companyId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));

        LocalDate today = LocalDate.now(DUBAI_ZONE);

        // 1. Find or create daily Attendance summary record
        Attendance att = attendanceRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseGet(() -> {
                    Attendance newAtt = new Attendance();
                    newAtt.setEmployee(employee);
                    newAtt.setCompany(company);
                    newAtt.setAttendanceDate(today);
                    newAtt.setAttendanceValidated(Attendance.AttendanceStatus.PENDING);
                    ShiftSchedule shift = employee.getShift();
                    if (shift != null) {
                        newAtt.setShift(shift);
                        if (shift.getMinimumWorkingHour() != null) {
                            newAtt.setMinimumHour(shift.getMinimumWorkingHour() / 60.0);
                        }
                    }
                    return attendanceRepository.save(newAtt);
                });

        // 2. Check if there's already an open activity (clocked in but not out)
        List<AttendanceActivity> activities = attendanceActivityRepository.findByEmployeeIdAndAttendanceDate(employeeId, today);
        boolean hasOpenActivity = activities.stream().anyMatch(a -> a.getClockOut() == null);

        if (hasOpenActivity) {
            return AttendanceResponse.from(att); // Already clocked in
        }

        // 3. Create new AttendanceActivity for this punch
        AttendanceActivity activity = new AttendanceActivity();
        activity.setEmployee(employee);
        activity.setAttendanceDate(today);
        activity.setClockIn(LocalTime.now(DUBAI_ZONE));
        activity.setClockInDate(today);
        activity.setInDatetime(java.time.LocalDateTime.now(DUBAI_ZONE));
        attendanceActivityRepository.save(activity);

        // 4. Update first check-in of the day if not set
        if (att.getCheckIn() == null) {
            att.setCheckIn(activity.getClockIn());
            att.setCheckInDate(today);
            att.setCheckInUtc(Instant.now());
            attendanceRepository.save(att);
        }

        AttendanceResponse res = AttendanceResponse.from(att);
        if (activity.getInDatetime() != null) {
            res.setCurrentSessionStartUtc(activity.getInDatetime().atZone(DUBAI_ZONE).toInstant());
        }
        return res;
    }

    @Transactional
    public AttendanceResponse clockOut(Long attendanceId) {
        Attendance att = find(attendanceId);
        LocalDate today = att.getAttendanceDate();
        Long employeeId = att.getEmployee().getId();

        // 1. Find the open activity for today
        List<AttendanceActivity> activities = attendanceActivityRepository.findByEmployeeIdAndAttendanceDate(employeeId, today);
        AttendanceActivity openActivity = activities.stream()
                .filter(a -> a.getClockOut() == null)
                .findFirst()
                .orElse(null);

        if (openActivity != null) {
            openActivity.setClockOut(LocalTime.now(DUBAI_ZONE));
            openActivity.setClockOutDate(today);
            openActivity.setOutDatetime(java.time.LocalDateTime.now(DUBAI_ZONE));
            attendanceActivityRepository.save(openActivity);

            // Create a WorkRecord for this specific punch
            generatePunchWorkRecord(openActivity, att);
        }

        // 2. Update summary Attendance record
        att.setCheckOut(LocalTime.now(DUBAI_ZONE));
        att.setCheckOutDate(today);
        att.setCheckOutUtc(Instant.now());

        attendanceRepository.save(att);
        autoComputeOnCheckout(att);

        return AttendanceResponse.from(att);
    }

    // ─── Not Clocked In / Out ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotClockedIn(Long companyId, LocalDate date) {
        List<Employee> allActive = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        List<Attendance> attendances = attendanceRepository.findByCompanyIdAndAttendanceDate(companyId, date);
        Set<Long> presentIds = new HashSet<>();
        for (Attendance a : attendances) {
            if (a.getEmployee() != null) presentIds.add(a.getEmployee().getId());
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Employee emp : allActive) {
            if (!presentIds.contains(emp.getId())) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", emp.getId());
                m.put("name", emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : ""));
                m.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : null);
                result.add(m);
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotClockedOut(Long companyId, LocalDate date) {
        List<Attendance> notOut = attendanceRepository.findByCompanyIdAndAttendanceDateAndCheckInIsNotNullAndCheckOutIsNull(companyId, date);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Attendance a : notOut) {
            Employee emp = a.getEmployee();
            if (emp != null) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", emp.getId());
                m.put("name", emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : ""));
                m.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : null);
                m.put("attendanceId", a.getId());
                m.put("checkIn", a.getCheckIn());
                result.add(m);
            }
        }
        return result;
    }

    // ─── Today's Attendance ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AttendanceResponse> getTodayAttendance(Long companyId) {
        return attendanceRepository.findByCompanyIdAndAttendanceDate(companyId, LocalDate.now(DUBAI_ZONE))
                .stream().map(AttendanceResponse::from).collect(Collectors.toList());
    }

    // ─── Bulk Approve Overtime ────────────────────────────────────────────────

    @Transactional
    public int bulkApproveOvertime(List<Long> ids) {
        int count = 0;
        for (Long id : ids) {
            overtimeRepository.findById(id).ifPresent(ot -> {
                ot.setStatus(AttendanceOverTime.OvertimeStatus.APPROVED);
                overtimeRepository.save(ot);
            });
            count++;
        }
        return count;
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(Long companyId, LocalDate date, Long departmentId) {
        LocalDate targetDate = date != null ? date : LocalDate.now(DUBAI_ZONE);

        List<Employee> allActive = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        if (departmentId != null) {
            allActive = allActive.stream()
                    .filter(e -> e.getDepartment() != null && departmentId.equals(e.getDepartment().getId()))
                    .collect(Collectors.toList());
        }
        long totalEmployees = allActive.size();

        Set<Long> activeEmpIds = allActive.stream().map(Employee::getId).collect(Collectors.toSet());

        List<Attendance> presentRecords = attendanceRepository.findByCompanyIdAndAttendanceDateAndCheckInIsNotNull(companyId, targetDate)
                .stream().filter(a -> a.getEmployee() != null && activeEmpIds.contains(a.getEmployee().getId()))
                .collect(Collectors.toList());
        long presentToday = presentRecords.size();
        long absentToday = totalEmployees - presentToday;
        long notOutYet = presentRecords.stream().filter(a -> a.getCheckOut() == null).count();

        List<Attendance> dayAttendances = attendanceRepository.findByCompanyIdAndAttendanceDate(companyId, targetDate)
                .stream().filter(a -> a.getEmployee() != null && activeEmpIds.contains(a.getEmployee().getId()))
                .collect(Collectors.toList());
        long lateCount = dayAttendances.stream()
                .flatMap(a -> lateComeEarlyOutRepository.findByAttendanceId(a.getId()).stream())
                .filter(le -> le.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME)
                .count();
        long overtimePending = overtimeRepository.findByCompanyId(companyId).stream()
                .filter(ot -> ot.getStatus() == AttendanceOverTime.OvertimeStatus.PENDING)
                .filter(ot -> ot.getEmployee() != null && activeEmpIds.contains(ot.getEmployee().getId()))
                .count();

        // Hours by department breakdown — last 7 days ending at targetDate
        LocalDate weekStart = targetDate.minusDays(6);
        List<Attendance> weekAttendances = attendanceRepository.findByCompanyIdAndAttendanceDateBetween(companyId, weekStart, targetDate)
                .stream().filter(a -> a.getEmployee() != null && activeEmpIds.contains(a.getEmployee().getId()))
                .collect(Collectors.toList());
        Map<String, Double> hoursByDeptMap = new LinkedHashMap<>();
        for (Attendance a : weekAttendances) {
            if (a.getEmployee().getDepartment() != null && a.getWorkedHour() != null) {
                String deptName = a.getEmployee().getDepartment().getName();
                hoursByDeptMap.merge(deptName, a.getWorkedHour(), Double::sum);
            }
        }
        List<Map<String, Object>> hoursByDepartment = hoursByDeptMap.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("department", e.getKey());
                    m.put("totalHours", Math.round(e.getValue() * 10.0) / 10.0);
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEmployees", totalEmployees);
        result.put("presentToday", presentToday);
        result.put("absentToday", absentToday);
        result.put("notOutYet", notOutYet);
        result.put("lateCount", lateCount);
        result.put("overtimePending", overtimePending);
        result.put("hoursByDepartment", hoursByDepartment);
        return result;
    }

    // ─── Excel Export / Import ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public void exportToExcel(Long companyId, HttpServletResponse response) throws IOException {
        List<Attendance> records = attendanceRepository.findByCompanyId(companyId);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Attendance");
            sheet.setDefaultRowHeightInPoints(20);

            // ── Styles ──────────────────────────────────────────────────
            XSSFCellStyle titleStyle    = xlTitleStyle(wb, "1E1B4B");
            XSSFCellStyle headerStyle   = xlHeaderStyle(wb, "6366F1");
            XSSFCellStyle evenStyle     = xlBodyStyle(wb, "EEF2FF"); // light indigo tint
            XSSFCellStyle oddStyle      = xlBodyStyle(wb, "FFFFFF");
            XSSFCellStyle approvedStyle = xlBadgeStyle(wb, "10B981");
            XSSFCellStyle pendingStyle  = xlBadgeStyle(wb, "F59E0B");
            XSSFCellStyle rejectedStyle = xlBadgeStyle(wb, "EF4444");

            String[] columns = {"Employee Name", "Date", "Check-In", "Check-Out", "Worked Hours", "Status"};

            // Title row
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("HRMS Pro  |  Attendance Export");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, columns.length - 1));
            for (int i = 1; i < columns.length; i++) titleRow.createCell(i).setCellStyle(titleStyle);

            // Header row
            Row headerRow = sheet.createRow(1);
            headerRow.setHeightInPoints(22);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 2;
            for (Attendance a : records) {
                Row row = sheet.createRow(rowNum);
                row.setHeightInPoints(18);
                XSSFCellStyle base = rowNum % 2 == 0 ? evenStyle : oddStyle;

                xlCell(row, 0, a.getEmployee() != null
                        ? a.getEmployee().getFirstName() + " " + (a.getEmployee().getLastName() != null ? a.getEmployee().getLastName() : "")
                        : "", base);
                xlCell(row, 1, a.getAttendanceDate() != null ? a.getAttendanceDate().toString() : "", base);
                xlCell(row, 2, a.getCheckIn()  != null ? a.getCheckIn().toString()  : "", base);
                xlCell(row, 3, a.getCheckOut() != null ? a.getCheckOut().toString() : "", base);

                Cell hoursCell = row.createCell(4);
                hoursCell.setCellValue(a.getWorkedHour() != null ? a.getWorkedHour() : 0.0);
                hoursCell.setCellStyle(base);

                String status = a.getAttendanceValidated() != null ? a.getAttendanceValidated().name() : "PENDING";
                Cell statusCell = row.createCell(5);
                statusCell.setCellValue(status);
                statusCell.setCellStyle(switch (status) {
                    case "APPROVED" -> approvedStyle;
                    case "REJECTED" -> rejectedStyle;
                    default         -> pendingStyle;
                });
                rowNum++;
            }

            // Column widths (in 1/256 char units)
            int[] widths = {6500, 3500, 3000, 3000, 3500, 3500};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i]);

            sheet.createFreezePane(0, 2);
            wb.write(response.getOutputStream());
        }
    }

    @Transactional(readOnly = true)
    public void exportWorkRecordsToExcel(Long companyId, Long employeeId, Boolean calculated, LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Specification<WorkRecord> spec = Specification.where((root, query, cb) -> cb.equal(root.get("company").get("id"), companyId));
        if (employeeId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("employee").get("id"), employeeId));
        }
        if (calculated != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isAttendanceRecord"), calculated));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("date"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("date"), to));
        }

        List<WorkRecord> records = workRecordRepository.findAll(spec);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=work_records.xlsx");

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Work Records");
            sheet.setDefaultRowHeightInPoints(20);

            XSSFCellStyle titleStyle  = xlTitleStyle(wb, "1E1B4B");
            XSSFCellStyle headerStyle = xlHeaderStyle(wb, "6366F1");
            XSSFCellStyle evenStyle   = xlBodyStyle(wb, "EEF2FF");
            XSSFCellStyle oddStyle    = xlBodyStyle(wb, "FFFFFF");

            String[] columns = {"Employee", "Date", "Status", "At Work", "Min Hour", "Day %", "Note"};

            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("HRMS Pro  |  Work Records Export");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, columns.length - 1));
            for (int i = 1; i < columns.length; i++) titleRow.createCell(i).setCellStyle(titleStyle);

            Row headerRow = sheet.createRow(1);
            headerRow.setHeightInPoints(22);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 2;
            for (WorkRecord r : records) {
                Row row = sheet.createRow(rowNum);
                row.setHeightInPoints(18);
                XSSFCellStyle base = rowNum % 2 == 0 ? evenStyle : oddStyle;

                xlCell(row, 0, r.getEmployee() != null ? r.getEmployee().getFirstName() + " " + (r.getEmployee().getLastName() != null ? r.getEmployee().getLastName() : "") : "", base);
                xlCell(row, 1, r.getDate() != null ? r.getDate().toString() : "", base);
                xlCell(row, 2, getWorkRecordTypeLabel(r.getWorkRecordType()), base);
                xlCell(row, 3, r.getAtWork(), base);
                xlCell(row, 4, r.getMinHour(), base);
                
                Cell pctCell = row.createCell(5);
                pctCell.setCellValue(r.getDayPercentage() != null ? r.getDayPercentage() * 100 : 0.0);
                pctCell.setCellStyle(base);
                
                xlCell(row, 6, r.getNote(), base);
                rowNum++;
            }

            int[] widths = {6500, 3500, 3500, 3000, 3000, 3000, 8000};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i]);

            sheet.createFreezePane(0, 2);
            wb.write(response.getOutputStream());
        }
    }

    private String getWorkRecordTypeLabel(WorkRecord.WorkRecordType type) {
        if (type == null) return "—";
        return switch (type) {
            case FDP  -> "Present";
            case HDP  -> "Half Day";
            case ABS  -> "Absent";
            case LEA  -> "On Leave";
            case HD   -> "Holiday";
            case MCO  -> "Missed Check Out";
            case WOF  -> "Weekly Off";
            case LFD  -> "On Leave";
            case LHD  -> "Half Day Leave";
            case CONF -> "Conflict";
            case DFT  -> "Draft";
            default   -> type.name();
        };
    }

    @Transactional
    public int importFromExcel(MultipartFile file, Long companyId) throws IOException {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        int count = 0;
        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String employeeName = getCellString(row, 0);
                String dateStr = getCellString(row, 1);
                String checkInStr = getCellString(row, 2);
                String checkOutStr = getCellString(row, 3);
                if (employeeName == null || employeeName.isBlank() || dateStr == null || dateStr.isBlank()) continue;
                // Try to match employee by name (first last)
                String[] parts = employeeName.trim().split(" ", 2);
                String firstName = parts[0];
                List<Employee> employees = employeeRepository.findByCompanyId(companyId);
                Employee found = employees.stream()
                        .filter(e -> e.getFirstName() != null && e.getFirstName().equalsIgnoreCase(firstName))
                        .findFirst().orElse(null);
                if (found == null) continue;
                Attendance att = new Attendance();
                att.setEmployee(found);
                att.setCompany(company);
                try { att.setAttendanceDate(LocalDate.parse(dateStr)); } catch (Exception e) { continue; }
                try { if (checkInStr != null && !checkInStr.isBlank()) att.setCheckIn(LocalTime.parse(checkInStr)); } catch (Exception ignored) {}
                try { if (checkOutStr != null && !checkOutStr.isBlank()) att.setCheckOut(LocalTime.parse(checkOutStr)); } catch (Exception ignored) {}
                att.setAttendanceValidated(Attendance.AttendanceStatus.PENDING);
                Attendance saved = attendanceRepository.save(att);
                // FIX #5: compute worked hours, overtime, WorkRecord and late detection for imports
                if (saved.getCheckOut() != null) {
                    autoComputeOnCheckout(saved);
                }
                count++;
            }
        }
        return count;
    }

    // ─── Attendance Register ──────────────────────────────────────────────────

    /**
     * Build a full monthly register matrix: all employees (company-scoped, optional dept filter)
     * as rows, each day of the month as columns. Uses identical classification logic as getCalendar()
     * so data is guaranteed consistent across both views.
     */
    @Transactional(readOnly = true)
    public AttendanceRegisterResponse getRegister(Long companyId, Long departmentId, int year, int month) {
        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate today = LocalDate.now(DUBAI_ZONE);

        // 1. Employees
        List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        if (departmentId != null) {
            employees = employees.stream()
                    .filter(e -> e.getDepartment() != null && departmentId.equals(e.getDepartment().getId()))
                    .collect(Collectors.toList());
        }

        // 2. All attendance records for company in month (single query)
        List<Attendance> allAttendances = attendanceRepository.findByCompanyIdAndAttendanceDateBetween(companyId, first, last);
        // Group by (employeeId -> (date -> attendance))
        Map<Long, Map<LocalDate, Attendance>> attByEmpDate = new HashMap<>();
        for (Attendance a : allAttendances) {
            if (a.getEmployee() == null || a.getAttendanceDate() == null) continue;
            attByEmpDate
                    .computeIfAbsent(a.getEmployee().getId(), k -> new HashMap<>())
                    .put(a.getAttendanceDate(), a);
        }

        // 3. All late/early records for those attendance IDs (single query)
        Set<Long> attIds = allAttendances.stream().map(Attendance::getId).collect(Collectors.toSet());
        Map<Long, List<AttendanceLateComeEarlyOut>> lateByAttId = new HashMap<>();
        if (!attIds.isEmpty()) {
            lateComeEarlyOutRepository.findByAttendanceIdIn(attIds)
                    .forEach(le -> lateByAttId.computeIfAbsent(le.getAttendance().getId(), k -> new ArrayList<>()).add(le));
        }

        // 4. All approved leaves for company in range (single query)
        List<LeaveRequest> allLeaves = leaveRequestRepository.findByCompanyIdAndStatus(companyId, LeaveRequest.LeaveStatus.APPROVED);
        // Group by employeeId -> list of leave requests overlapping this month
        Map<Long, Map<LocalDate, String>> leaveByEmpDate = new HashMap<>();
        for (LeaveRequest lr : allLeaves) {
            if (lr.getStartDate() == null || lr.getEndDate() == null || lr.getEmployee() == null) continue;
            if (lr.getEndDate().isBefore(first) || lr.getStartDate().isAfter(last)) continue;
            LocalDate lStart = lr.getStartDate().isBefore(first) ? first : lr.getStartDate();
            LocalDate lEnd = lr.getEndDate().isAfter(last) ? last : lr.getEndDate();
            String typeName = lr.getLeaveType() != null ? lr.getLeaveType().getName() : "Leave";
            Long empId = lr.getEmployee().getId();
            Map<LocalDate, String> empLeaves = leaveByEmpDate.computeIfAbsent(empId, k -> new HashMap<>());
            for (LocalDate d = lStart; !d.isAfter(lEnd); d = d.plusDays(1)) {
                empLeaves.put(d, typeName);
            }
        }

        // 5. Holidays for company in month (single query)
        Map<LocalDate, String> holidayMap = new HashMap<>();
        List<Holiday> holidays = holidayRepository.findByCompanyIdAndDateRange(companyId, first, last);
        for (Holiday h : holidays) {
            if (h.getStartDate() == null) continue;
            LocalDate hEnd = h.getEndDate() != null ? h.getEndDate() : h.getStartDate();
            LocalDate hStart = h.getStartDate().isBefore(first) ? first : h.getStartDate();
            hEnd = hEnd.isAfter(last) ? last : hEnd;
            for (LocalDate d = hStart; !d.isAfter(hEnd); d = d.plusDays(1)) {
                holidayMap.put(d, h.getName() != null ? h.getName() : "Holiday");
            }
        }

        // 6. Build date list for column headers
        List<String> dates = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            dates.add(d.toString());
        }

        // 7. Build rows
        List<AttendanceRegisterRowDto> rows = new ArrayList<>();
        for (Employee emp : employees) {
            Map<LocalDate, Attendance> empAtt = attByEmpDate.getOrDefault(emp.getId(), Collections.emptyMap());
            Map<LocalDate, String> empLeaves = leaveByEmpDate.getOrDefault(emp.getId(), Collections.emptyMap());

            Map<String, AttendanceRegisterDayDto> dayCells = new LinkedHashMap<>();
            int presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0;

            for (LocalDate cur = first; !cur.isAfter(last); cur = cur.plusDays(1)) {
                AttendanceRegisterDayDto cell = new AttendanceRegisterDayDto();
                boolean isWeekend = cur.getDayOfWeek().getValue() >= 6;

                if (cur.isAfter(today)) {
                    cell.setDayType("future");
                    cell.setDisplayStatus("-");
                } else if (holidayMap.containsKey(cur)) {
                    cell.setDayType("holiday");
                    cell.setDisplayStatus("H");
                } else {
                    Attendance att = empAtt.get(cur);
                    if (att == null) {
                        if (empLeaves.containsKey(cur)) {
                            cell.setDayType("on_leave");
                            cell.setDisplayStatus("OL");
                            leaveCount++;
                        } else if (isWeekend) {
                            cell.setDayType("weekly_off");
                            cell.setDisplayStatus("WO");
                        } else {
                            cell.setDayType("absent");
                            cell.setDisplayStatus("A");
                            absentCount++;
                        }
                    } else {
                        cell.setAttendanceId(att.getId());
                        List<AttendanceLateComeEarlyOut> les = lateByAttId.getOrDefault(att.getId(), Collections.emptyList());
                        boolean hasLateCome = les.stream().anyMatch(le -> le.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                        cell.setLate(hasLateCome);

                        // Mirror exact dayType logic from getCalendar()
                        String dayType;
                        if (Boolean.TRUE.equals(att.getIsValidateRequestApproved())) {
                            dayType = "present";
                        } else if (Boolean.TRUE.equals(att.getIsValidateRequest())) {
                            dayType = "irregular";
                        } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.APPROVED) {
                            dayType = "present";
                        } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.REJECTED) {
                            dayType = "absent";
                        } else {
                            dayType = les.isEmpty() ? "present" : "irregular";
                        }
                        cell.setDayType(dayType);

                        if (hasLateCome) {
                            cell.setDisplayStatus("L");
                            lateCount++;
                        } else if ("absent".equals(dayType)) {
                            cell.setDisplayStatus("A");
                            absentCount++;
                        } else {
                            cell.setDisplayStatus("P");
                            presentCount++;
                        }
                    }
                }
                dayCells.put(cur.toString(), cell);
            }

            AttendanceRegisterRowDto row = new AttendanceRegisterRowDto();
            row.setEmployeeId(emp.getId());
            row.setName(emp.getFirstName() + (emp.getLastName() != null ? " " + emp.getLastName() : ""));
            row.setDepartment(emp.getDepartment() != null ? emp.getDepartment().getName() : null);
            row.setAvatarUrl(emp.getPhotoPath());
            row.setDays(dayCells);
            row.setPresentCount(presentCount);
            row.setAbsentCount(absentCount);
            row.setLateCount(lateCount);
            row.setLeaveCount(leaveCount);
            rows.add(row);
        }

        String monthLabel = first.getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH) + " " + year;
        AttendanceRegisterResponse response = new AttendanceRegisterResponse();
        response.setDates(dates);
        response.setEmployees(rows);
        response.setYear(year);
        response.setMonth(month);
        response.setMonthLabel(monthLabel);
        return response;
    }

    /**
     * Inline-edit a single register cell. Accepted statuses: present, absent, late.
     * Uses the same attendance record structure so the calendar view stays consistent.
     */
    @Transactional
    public AttendanceRegisterDayDto updateRegisterCell(Long employeeId, LocalDate date, String status, Long companyId) {
        Attendance att = attendanceRepository.findByEmployeeIdAndAttendanceDate(employeeId, date).orElse(null);

        switch (status.toLowerCase()) {
            case "absent" -> {
                if (att != null) {
                    att.setActive(false);
                    attendanceRepository.save(att);
                    // Remove any late/early entries
                    lateComeEarlyOutRepository.findByAttendanceId(att.getId())
                            .forEach(le -> lateComeEarlyOutRepository.delete(le));
                }
                AttendanceRegisterDayDto absent = new AttendanceRegisterDayDto();
                absent.setDayType("absent");
                absent.setDisplayStatus("A");
                return absent;
            }
            case "late" -> {
                if (att == null) {
                    Employee emp = employeeRepository.findById(employeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
                    Company company = companyRepository.findById(companyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
                    att = new Attendance();
                    att.setEmployee(emp);
                    att.setCompany(company);
                    att.setAttendanceDate(date);
                    att.setAttendanceValidated(Attendance.AttendanceStatus.PENDING);
                    att = attendanceRepository.save(att);
                } else {
                    att.setActive(true);
                    att = attendanceRepository.save(att);
                }
                // Ensure a LATE_COME entry exists
                final Long attId = att.getId();
                boolean exists = lateComeEarlyOutRepository.findByAttendanceId(attId).stream()
                        .anyMatch(le -> le.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                if (!exists) {
                    AttendanceLateComeEarlyOut late = new AttendanceLateComeEarlyOut();
                    late.setAttendance(att);
                    late.setEmployee(att.getEmployee());
                    late.setType(AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                    lateComeEarlyOutRepository.save(late);
                }
                AttendanceRegisterDayDto lateDto = new AttendanceRegisterDayDto();
                lateDto.setAttendanceId(att.getId());
                lateDto.setDayType("irregular");
                lateDto.setDisplayStatus("L");
                lateDto.setLate(true);
                return lateDto;
            }
            default -> { // "present"
                if (att == null) {
                    Employee emp = employeeRepository.findById(employeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
                    Company company = companyRepository.findById(companyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
                    att = new Attendance();
                    att.setEmployee(emp);
                    att.setCompany(company);
                    att.setAttendanceDate(date);
                    att.setAttendanceValidated(Attendance.AttendanceStatus.APPROVED);
                    att = attendanceRepository.save(att);
                } else {
                    att.setActive(true);
                    att.setAttendanceValidated(Attendance.AttendanceStatus.APPROVED);
                    att.setIsValidateRequestApproved(true);
                    att = attendanceRepository.save(att);
                    // Remove any late come entries so it shows as pure present
                    lateComeEarlyOutRepository.findByAttendanceId(att.getId()).stream()
                            .filter(le -> le.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME)
                            .forEach(le -> lateComeEarlyOutRepository.delete(le));
                }
                AttendanceRegisterDayDto present = new AttendanceRegisterDayDto();
                present.setAttendanceId(att.getId());
                present.setDayType("present");
                present.setDisplayStatus("P");
                return present;
            }
        }
    }

    /**
     * Export the register matrix as a themed Excel file.
     * Each employee is a row; each date column contains P / A / L / WO / H / OL.
     * Cells are color-coded to match the web UI theme.
     */
    @Transactional(readOnly = true)
    public void exportRegisterToExcel(Long companyId, Long departmentId, int year, int month,
                                      HttpServletResponse response) throws IOException {
        AttendanceRegisterResponse register = getRegister(companyId, departmentId, year, month);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        String filename = "attendance_register_" + register.getMonthLabel().replace(" ", "_") + ".xlsx";
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(register.getMonthLabel());
            sheet.setDefaultRowHeightInPoints(20);

            // ── Styles ──────────────────────────────────────────────────
            XSSFCellStyle titleStyle     = xlTitleStyle(wb, "1E1B4B");
            XSSFCellStyle headerStyle    = xlHeaderStyle(wb, "4F46E5");
            XSSFCellStyle empStyle       = xlBodyStyle(wb, "EEF2FF");
            XSSFCellStyle deptStyle      = xlBodyStyle(wb, "F5F3FF");
            XSSFCellStyle evenStyle      = xlBodyStyle(wb, "FAFAFA");
            XSSFCellStyle oddStyle       = xlBodyStyle(wb, "FFFFFF");
            // Status cell styles — match the web UI
            XSSFCellStyle presentStyle   = xlBadgeStyle(wb, "10B981"); // green  — P
            XSSFCellStyle absentStyle    = xlBadgeStyle(wb, "EF4444"); // red    — A
            XSSFCellStyle lateStyle      = xlBadgeStyle(wb, "F59E0B"); // amber  — L
            XSSFCellStyle weeklyOffStyle = xlBadgeStyle(wb, "9CA3AF"); // gray   — WO
            XSSFCellStyle holidayStyle   = xlBadgeStyle(wb, "64748B"); // slate  — H
            XSSFCellStyle onLeaveStyle   = xlBadgeStyle(wb, "3B82F6"); // blue   — OL
            XSSFCellStyle futureStyle    = xlBadgeStyle(wb, "E5E7EB"); // pale   — -
            // Summary header badges (in header row)
            XSSFCellStyle hdrPresent     = xlBadgeStyle(wb, "10B981");
            XSSFCellStyle hdrAbsent      = xlBadgeStyle(wb, "EF4444");
            XSSFCellStyle hdrLate        = xlBadgeStyle(wb, "F59E0B");
            XSSFCellStyle hdrLeave       = xlBadgeStyle(wb, "3B82F6");
            // Summary count cells
            XSSFCellStyle sumPresent     = xlSummaryStyle(wb, "10B981");
            XSSFCellStyle sumAbsent      = xlSummaryStyle(wb, "EF4444");
            XSSFCellStyle sumLate        = xlSummaryStyle(wb, "F59E0B");
            XSSFCellStyle sumLeave       = xlSummaryStyle(wb, "3B82F6");

            List<String> dates = register.getDates();
            int numDates = dates.size();
            int summaryStart = 2 + numDates;

            // Title row
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("HRMS Pro  |  Attendance Register  —  " + register.getMonthLabel());
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, summaryStart + 3));
            for (int i = 1; i <= summaryStart + 3; i++) titleRow.createCell(i).setCellStyle(titleStyle);

            // Header row
            Row header = sheet.createRow(1);
            header.setHeightInPoints(22);
            xlCell(header, 0, "Employee",   headerStyle);
            xlCell(header, 1, "Department", headerStyle);
            for (int i = 0; i < numDates; i++) {
                String day = dates.get(i).substring(8);
                xlCell(header, 2 + i, day.startsWith("0") ? day.substring(1) : day, headerStyle);
            }
            xlCell(header, summaryStart,     "P",  hdrPresent);
            xlCell(header, summaryStart + 1, "A",  hdrAbsent);
            xlCell(header, summaryStart + 2, "L",  hdrLate);
            xlCell(header, summaryStart + 3, "OL", hdrLeave);

            // Data rows
            int rowNum = 2;
            for (AttendanceRegisterRowDto emp : register.getEmployees()) {
                Row row = sheet.createRow(rowNum);
                row.setHeightInPoints(18);
                XSSFCellStyle baseStyle = rowNum % 2 == 0 ? evenStyle : oddStyle;

                xlCell(row, 0, emp.getName(), empStyle);
                xlCell(row, 1, emp.getDepartment() != null ? emp.getDepartment() : "", deptStyle);

                for (int i = 0; i < numDates; i++) {
                    AttendanceRegisterDayDto cell = emp.getDays().get(dates.get(i));
                    String ds = cell != null && cell.getDisplayStatus() != null ? cell.getDisplayStatus() : "-";
                    XSSFCellStyle cellStyle = switch (ds) {
                        case "P"  -> presentStyle;
                        case "A"  -> absentStyle;
                        case "L"  -> lateStyle;
                        case "WO" -> weeklyOffStyle;
                        case "H"  -> holidayStyle;
                        case "OL" -> onLeaveStyle;
                        default   -> futureStyle;
                    };
                    xlCell(row, 2 + i, ds, cellStyle);
                }

                xlNumCell(row, summaryStart,     emp.getPresentCount(), sumPresent);
                xlNumCell(row, summaryStart + 1, emp.getAbsentCount(),  sumAbsent);
                xlNumCell(row, summaryStart + 2, emp.getLateCount(),    sumLate);
                xlNumCell(row, summaryStart + 3, emp.getLeaveCount(),   sumLeave);
                rowNum++;
            }

            // Column widths
            sheet.setColumnWidth(0, 5500); // Employee
            sheet.setColumnWidth(1, 3800); // Department
            for (int i = 0; i < numDates; i++) sheet.setColumnWidth(2 + i, 1100);
            for (int i = 0; i < 4; i++)    sheet.setColumnWidth(summaryStart + i, 1600);

            sheet.createFreezePane(2, 2); // freeze employee/dept cols + title+header rows
            wb.write(response.getOutputStream());
        }
    }

    // ── Excel Theming Helpers ─────────────────────────────────────────────────

    private XSSFCellStyle xlTitleStyle(XSSFWorkbook wb, String bgHex) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexRgb(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setBold(true);
        f.setColor(new XSSFColor(hexRgb("FFFFFF"), null));
        f.setFontHeightInPoints((short) 13);
        f.setFontName("Calibri");
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        return s;
    }

    private XSSFCellStyle xlHeaderStyle(XSSFWorkbook wb, String bgHex) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexRgb(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setBold(true);
        f.setColor(new XSSFColor(hexRgb("FFFFFF"), null));
        f.setFontHeightInPoints((short) 11);
        f.setFontName("Calibri");
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        xlBorder(s, BorderStyle.THIN, "8B8BCC");
        return s;
    }

    private XSSFCellStyle xlBodyStyle(XSSFWorkbook wb, String bgHex) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexRgb(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setColor(new XSSFColor(hexRgb("1F2937"), null));
        f.setFontHeightInPoints((short) 10);
        f.setFontName("Calibri");
        s.setFont(f);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        xlBorder(s, BorderStyle.THIN, "E5E7EB");
        return s;
    }

    /** Solid-color badge cell: white text on dark backgrounds, dark text on light ones. */
    private XSSFCellStyle xlBadgeStyle(XSSFWorkbook wb, String bgHex) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexRgb(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setBold(true);
        f.setColor(new XSSFColor(hexRgb(xlIsLight(bgHex) ? "374151" : "FFFFFF"), null));
        f.setFontHeightInPoints((short) 10);
        f.setFontName("Calibri");
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        xlBorder(s, BorderStyle.THIN, "D1D5DB");
        return s;
    }

    /** Bold numeric summary cell (e.g. present/absent counts). */
    private XSSFCellStyle xlSummaryStyle(XSSFWorkbook wb, String bgHex) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexRgb(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setBold(true);
        f.setColor(new XSSFColor(hexRgb("FFFFFF"), null));
        f.setFontHeightInPoints((short) 10);
        f.setFontName("Calibri");
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        xlBorder(s, BorderStyle.THIN, "D1D5DB");
        return s;
    }

    private void xlBorder(XSSFCellStyle s, BorderStyle bs, String hexColor) {
        s.setBorderTop(bs); s.setBorderBottom(bs);
        s.setBorderLeft(bs); s.setBorderRight(bs);
        XSSFColor c = new XSSFColor(hexRgb(hexColor), null);
        s.setTopBorderColor(c); s.setBottomBorderColor(c);
        s.setLeftBorderColor(c); s.setRightBorderColor(c);
    }

    private void xlCell(Row row, int col, String value, XSSFCellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void xlNumCell(Row row, int col, int value, XSSFCellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private byte[] hexRgb(String hex) {
        return new byte[]{
            (byte) Integer.parseInt(hex.substring(0, 2), 16),
            (byte) Integer.parseInt(hex.substring(2, 4), 16),
            (byte) Integer.parseInt(hex.substring(4, 6), 16)
        };
    }

    /** Returns true if the color is light enough to warrant dark text. */
    private boolean xlIsLight(String hex) {
        double r = Integer.parseInt(hex.substring(0, 2), 16);
        double g = Integer.parseInt(hex.substring(2, 4), 16);
        double b = Integer.parseInt(hex.substring(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0 > 0.6;
    }

    private String getCellString(Row row, int col) {
        if (row.getCell(col) == null) return null;
        return row.getCell(col).toString().trim();
    }

    private Attendance buildAttendance(Attendance att, AttendanceRequest req) {
        att.setEmployee(employeeRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", req.getEmployeeId())));
        att.setCompany(companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId())));
        att.setAttendanceDate(req.getAttendanceDate());
        att.setCheckIn(req.getCheckIn());
        att.setCheckOut(req.getCheckOut());
        att.setCheckInDate(req.getCheckInDate());
        att.setCheckOutDate(req.getCheckOutDate());
        att.setWorkedHour(req.getWorkedHour());
        att.setMinimumHour(req.getMinimumHour());
        if (req.getShiftId() != null) att.setShift(shiftScheduleRepository.findById(req.getShiftId()).orElse(null));
        if (req.getWorkTypeId() != null) att.setWorkType(workTypeRepository.findById(req.getWorkTypeId()).orElse(null));
        return att;
    }
}
