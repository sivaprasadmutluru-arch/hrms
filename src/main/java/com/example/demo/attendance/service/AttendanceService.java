package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.AttendanceCalendarDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterResponse;
import com.example.demo.attendance.dto.AttendanceRegisterRowDto;
import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
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
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    private final WorkRecordRepository workRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final HolidayAllocationRepository holidayAllocationRepository;

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

            // Auto-generate WorkRecord for payroll based on actual hours vs shift minimum
            generateWorkRecord(att, worked);
        }

        // Detect late/early: check branch-level grace first, then fall back to org-level
        int graceMinutes = 0;
        if (att.getCompany() != null) {
            Long companyId = att.getCompany().getId();
            graceMinutes = graceTimeRepository
                    .findFirstByCompanyIdAndIsDefaultTrue(companyId)
                    .map(g -> g.getAllowedTimeInSeconds() != null ? g.getAllowedTimeInSeconds() / 60 : 0)
                    .orElseGet(() -> {
                        Organization org = att.getCompany().getOrganization();
                        if (org == null) return 0;
                        return graceTimeRepository
                                .findFirstByOrganizationIdAndIsDefaultTrue(org.getId())
                                .map(g -> g.getAllowedTimeInSeconds() != null ? g.getAllowedTimeInSeconds() / 60 : 0)
                                .orElse(0);
                    });
        }
        detectLateComeEarlyOut(att.getId(), graceMinutes);
    }

    /**
     * Auto-generate or update a WorkRecord from a completed attendance.
     * Classification: FDP (>= minHours), HDP (>= half minHours), or proportional HDP.
     * minimumWorkingHour on ShiftSchedule is stored in minutes (e.g. 480 = 8h).
     */
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
                type = WorkRecord.WorkRecordType.HDP;
                dayPercentage = minHours > 0 ? workedHours / minHours : 0.0;
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
        wr.setLastUpdate(java.time.LocalDateTime.now());
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
        LocalDate today = LocalDate.now();

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
        Attendance att = new Attendance();
        att.setEmployee(employee);
        att.setCompany(company);
        att.setAttendanceDate(LocalDate.now());
        att.setCheckIn(LocalTime.now());
        att.setCheckInDate(LocalDate.now());
        att.setAttendanceValidated(Attendance.AttendanceStatus.PENDING);

        // Auto-attach employee's assigned shift and derive minimum hours for the day
        ShiftSchedule shift = employee.getShift();
        if (shift != null) {
            att.setShift(shift);
            if (shift.getMinimumWorkingHour() != null) {
                // minimumWorkingHour is in minutes; convert to hours for the attendance record
                att.setMinimumHour(shift.getMinimumWorkingHour() / 60.0);
            }
        }

        return AttendanceResponse.from(attendanceRepository.save(att));
    }

    @Transactional
    public AttendanceResponse clockOut(Long attendanceId) {
        Attendance att = find(attendanceId);
        att.setCheckOut(LocalTime.now());
        att.setCheckOutDate(LocalDate.now());
        att = attendanceRepository.save(att);
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
        return attendanceRepository.findByCompanyIdAndAttendanceDate(companyId, LocalDate.now())
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
    public Map<String, Object> getDashboard(Long companyId, LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        long totalEmployees = employeeRepository.countByCompanyIdAndIsActiveTrue(companyId);
        List<Attendance> presentRecords = attendanceRepository.findByCompanyIdAndAttendanceDateAndCheckInIsNotNull(companyId, targetDate);
        long presentToday = presentRecords.size();
        long absentToday = totalEmployees - presentToday;
        long notOutYet = attendanceRepository.findByCompanyIdAndAttendanceDateAndCheckInIsNotNullAndCheckOutIsNull(companyId, targetDate).size();
        // Count late arrivals on that date
        List<Attendance> dayAttendances = attendanceRepository.findByCompanyIdAndAttendanceDate(companyId, targetDate);
        long lateCount = dayAttendances.stream()
                .flatMap(a -> lateComeEarlyOutRepository.findByAttendanceId(a.getId()).stream())
                .filter(le -> le.getType() == AttendanceLateComeEarlyOut.EntryType.LATE_COME)
                .count();
        long overtimePending = overtimeRepository.findByCompanyId(companyId).stream()
                .filter(ot -> ot.getStatus() == AttendanceOverTime.OvertimeStatus.PENDING)
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEmployees", totalEmployees);
        result.put("presentToday", presentToday);
        result.put("absentToday", absentToday);
        result.put("notOutYet", notOutYet);
        result.put("lateCount", lateCount);
        result.put("overtimePending", overtimePending);
        return result;
    }

    // ─── Excel Export / Import ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public void exportToExcel(Long companyId, HttpServletResponse response) throws IOException {
        List<Attendance> records = attendanceRepository.findByCompanyId(companyId);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Attendance");
            Row header = sheet.createRow(0);
            String[] columns = {"Employee Name", "Date", "Check-In", "Check-Out", "Worked Hours", "Status"};
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }
            int rowNum = 1;
            for (Attendance a : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(a.getEmployee() != null
                        ? a.getEmployee().getFirstName() + " " + (a.getEmployee().getLastName() != null ? a.getEmployee().getLastName() : "") : "");
                row.createCell(1).setCellValue(a.getAttendanceDate() != null ? a.getAttendanceDate().toString() : "");
                row.createCell(2).setCellValue(a.getCheckIn() != null ? a.getCheckIn().toString() : "");
                row.createCell(3).setCellValue(a.getCheckOut() != null ? a.getCheckOut().toString() : "");
                row.createCell(4).setCellValue(a.getWorkedHour() != null ? a.getWorkedHour() : 0.0);
                row.createCell(5).setCellValue(a.getAttendanceValidated() != null ? a.getAttendanceValidated().name() : "");
            }
            workbook.write(response.getOutputStream());
        }
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
                attendanceRepository.save(att);
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
        LocalDate today = LocalDate.now();

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
     * Export the register matrix as an Excel file.
     * Each employee is a row; each date column contains P / A / L / WO / H / OL.
     */
    @Transactional(readOnly = true)
    public void exportRegisterToExcel(Long companyId, Long departmentId, int year, int month,
                                      HttpServletResponse response) throws IOException {
        AttendanceRegisterResponse register = getRegister(companyId, departmentId, year, month);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        String filename = "attendance_register_" + register.getMonthLabel().replace(" ", "_") + ".xlsx";
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(register.getMonthLabel());

            // Header row: Employee | Dept | <dates...> | P | A | L | Leave
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Employee");
            header.createCell(1).setCellValue("Department");
            List<String> dates = register.getDates();
            for (int i = 0; i < dates.size(); i++) {
                // Show day number only (e.g. "1", "2") to keep columns narrow
                String day = dates.get(i).substring(8); // last 2 chars = day
                header.createCell(2 + i).setCellValue(day.startsWith("0") ? day.substring(1) : day);
            }
            int summaryStart = 2 + dates.size();
            header.createCell(summaryStart).setCellValue("Present");
            header.createCell(summaryStart + 1).setCellValue("Absent");
            header.createCell(summaryStart + 2).setCellValue("Late");
            header.createCell(summaryStart + 3).setCellValue("Leave");

            // Data rows
            int rowNum = 1;
            for (AttendanceRegisterRowDto emp : register.getEmployees()) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(emp.getName());
                row.createCell(1).setCellValue(emp.getDepartment() != null ? emp.getDepartment() : "");
                for (int i = 0; i < dates.size(); i++) {
                    AttendanceRegisterDayDto cell = emp.getDays().get(dates.get(i));
                    row.createCell(2 + i).setCellValue(cell != null ? cell.getDisplayStatus() : "-");
                }
                row.createCell(summaryStart).setCellValue(emp.getPresentCount());
                row.createCell(summaryStart + 1).setCellValue(emp.getAbsentCount());
                row.createCell(summaryStart + 2).setCellValue(emp.getLateCount());
                row.createCell(summaryStart + 3).setCellValue(emp.getLeaveCount());
            }
            workbook.write(response.getOutputStream());
        }
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
