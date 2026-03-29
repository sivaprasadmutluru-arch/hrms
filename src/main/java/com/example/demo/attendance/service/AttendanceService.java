package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.AttendanceCalendarDayDto;
import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceLateComeEarlyOut;
import com.example.demo.attendance.entity.AttendanceOverTime;
import com.example.demo.attendance.repository.*;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.base.repository.WorkTypeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final AttendanceLateComeEarlyOutRepository lateComeEarlyOutRepository;
    private final AttendanceOverTimeRepository overtimeRepository;
    private final GraceTimeRepository graceTimeRepository;

    /**
     * ENTERPRISE_ADMIN → sees attendance across all branches.
     * BRANCH_ADMIN → sees attendance only in their branch.
     * DEPARTMENT_MANAGER → sees only their department employees' attendance.
     * EMPLOYEE (SELF scope) → sees only their own attendance records.
     */
    @Transactional(readOnly = true)
    public Page<AttendanceResponse> getAll(Pageable pageable) {
        Specification<Attendance> spec = ScopeFilter.byEmployeeDepartment();
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
        return AttendanceResponse.from(attendanceRepository.save(buildAttendance(new Attendance(), req)));
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

    private void autoComputeOnCheckout(Attendance att) {
        // Compute worked hours
        if (att.getCheckIn() != null) {
            LocalTime in = att.getCheckIn();
            LocalTime out = att.getCheckOut();
            long minutes;
            if (out.isBefore(in)) {
                minutes = ChronoUnit.MINUTES.between(in, LocalTime.MAX) + 1
                        + ChronoUnit.MINUTES.between(LocalTime.MIN, out);
            } else {
                minutes = ChronoUnit.MINUTES.between(in, out);
            }
            double worked = minutes / 60.0;
            att.setWorkedHour(worked);
            if (att.getMinimumHour() != null && worked > att.getMinimumHour()) {
                att.setAttendanceOvertime(worked - att.getMinimumHour());
            }
            attendanceRepository.save(att);
        }

        // Detect late/early using company grace time (default 0 if not configured)
        int graceMinutes = 0;
        if (att.getCompany() != null) {
            graceMinutes = graceTimeRepository
                    .findFirstByCompanyIdAndIsDefaultTrue(att.getCompany().getId())
                    .map(g -> g.getAllowedTimeInSeconds() != null ? g.getAllowedTimeInSeconds() / 60 : 0)
                    .orElse(0);
        }
        detectLateComeEarlyOut(att.getId(), graceMinutes);
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
            double worked = minutes / 60.0;
            att.setWorkedHour(worked);

            // Compute overtime vs minimum
            if (att.getMinimumHour() != null && worked > att.getMinimumHour()) {
                att.setAttendanceOvertime(worked - att.getMinimumHour());
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
                boolean exists = lateComeEarlyOutRepository.findByAttendanceId(attendanceId).stream()
                        .anyMatch(e -> e.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                if (!exists) {
                    AttendanceLateComeEarlyOut late = new AttendanceLateComeEarlyOut();
                    late.setAttendance(att);
                    late.setEmployee(att.getEmployee());
                    late.setType(AttendanceLateComeEarlyOut.EntryType.LATE_COME);
                    lateComeEarlyOutRepository.save(late);
                }
            }
        }

        // Early out
        if (shift.getEndTime() != null && att.getCheckOut() != null) {
            long earlyMinutes = ChronoUnit.MINUTES.between(att.getCheckOut(), shift.getEndTime());
            if (earlyMinutes > graceMinutes) {
                boolean exists = lateComeEarlyOutRepository.findByAttendanceId(attendanceId).stream()
                        .anyMatch(e -> e.getType() == AttendanceLateComeEarlyOut.EntryType.EARLY_OUT);
                if (!exists) {
                    AttendanceLateComeEarlyOut early = new AttendanceLateComeEarlyOut();
                    early.setAttendance(att);
                    early.setEmployee(att.getEmployee());
                    early.setType(AttendanceLateComeEarlyOut.EntryType.EARLY_OUT);
                    lateComeEarlyOutRepository.save(early);
                }
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
     * Approve an overtime record.
     */
    @Transactional
    public AttendanceOverTime approveOvertime(Long overtimeId) {
        AttendanceOverTime ot = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceOverTime", overtimeId));
        ot.setStatus(AttendanceOverTime.OvertimeStatus.APPROVED);
        return overtimeRepository.save(ot);
    }

    /**
     * Reject an overtime record.
     */
    @Transactional
    public AttendanceOverTime rejectOvertime(Long overtimeId) {
        AttendanceOverTime ot = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceOverTime", overtimeId));
        ot.setStatus(AttendanceOverTime.OvertimeStatus.REJECTED);
        return overtimeRepository.save(ot);
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
        if (resolvedEmployeeId == null) {
            AccessScopeContext.ScopeData scope = AccessScopeContext.get();
            if (scope != null && scope.getUserId() != null) {
                Employee emp = employeeRepository.findByUserId(scope.getUserId()).orElse(null);
                if (emp != null) resolvedEmployeeId = emp.getId();
            }
        }
        if (resolvedEmployeeId == null) return Collections.emptyList();

        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate today = LocalDate.now();

        List<Attendance> attendances = attendanceRepository.findByEmployeeIdAndAttendanceDateBetween(resolvedEmployeeId, first, last);
        Map<LocalDate, Attendance> attendanceMap = attendances.stream()
                .collect(Collectors.toMap(Attendance::getAttendanceDate, a -> a));

        List<AttendanceLateComeEarlyOut> lateEarlyList = lateComeEarlyOutRepository.findByEmployeeId(resolvedEmployeeId);
        Map<Long, List<AttendanceLateComeEarlyOut>> lateEarlyByAttendance = lateEarlyList.stream()
                .collect(Collectors.groupingBy(le -> le.getAttendance().getId()));

        List<AttendanceCalendarDayDto> days = new ArrayList<>();
        LocalDate cur = first;
        while (!cur.isAfter(last) && !cur.isAfter(today)) {
            AttendanceCalendarDayDto dto = new AttendanceCalendarDayDto();
            dto.setDate(cur);
            dto.setDateName(cur.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH));

            Attendance att = attendanceMap.get(cur);
            if (att != null) {
                dto.setAttendanceId(att.getId());
                dto.setCheckIn(att.getCheckIn());
                dto.setCheckInDate(att.getCheckInDate());
                dto.setCheckOut(att.getCheckOut());
                dto.setCheckOutDate(att.getCheckOutDate());
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

                List<AttendanceLateComeEarlyOut> les = lateEarlyByAttendance.getOrDefault(att.getId(), Collections.emptyList());
                dto.setTypes(les.stream().map(le -> le.getType().name()).collect(Collectors.toList()));
                dto.setPenalties(les.size());

                if (Boolean.TRUE.equals(att.getIsValidateRequestApproved())) {
                    dto.setStatus("approved"); dto.setRowClass("blue");
                } else if (Boolean.TRUE.equals(att.getIsValidateRequest())) {
                    dto.setStatus("requested"); dto.setRowClass("orange");
                } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.APPROVED) {
                    dto.setStatus("on_time"); dto.setRowClass("green");
                } else if (att.getAttendanceValidated() == Attendance.AttendanceStatus.REJECTED) {
                    dto.setStatus("rejected"); dto.setRowClass("red");
                } else {
                    dto.setStatus("not_regularized"); dto.setRowClass("red");
                }
            } else {
                dto.setTypes(Collections.emptyList());
                dto.setStatus("no_record");
                dto.setRowClass("gray");
            }

            days.add(dto);
            cur = cur.plusDays(1);
        }
        return days;
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
