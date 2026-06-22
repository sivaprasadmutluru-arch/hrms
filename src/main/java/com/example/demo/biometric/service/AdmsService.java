package com.example.demo.biometric.service;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceActivity;
import com.example.demo.attendance.repository.AttendanceActivityRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.biometric.entity.BiometricDevice;
import com.example.demo.biometric.entity.BiometricEmployee;
import com.example.demo.biometric.repository.BiometricDeviceRepository;
import com.example.demo.biometric.repository.BiometricEmployeeRepository;
import com.example.demo.employee.entity.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service for processing ZKTeco ADMS push protocol data.
 *
 * Parses ATTLOG content (tab-delimited punch records) and creates/updates
 * Attendance and AttendanceActivity records accordingly.
 *
 * ATTLOG line format: USER_ID\tDATETIME\tSTATUS\tVERIFY_TYPE\tWORK_CODE\tRESERVED
 * STATUS codes: 0=Check In, 1=Check Out, 2=Break Out, 3=Break In, 4=OT In, 5=OT Out
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdmsService {

    private static final DateTimeFormatter PUNCH_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId DEVICE_TIMEZONE = ZoneId.of("Asia/Dubai");
    private static final Set<Integer> CLOCK_IN_CODES = Set.of(0, 2, 4);

    private final BiometricDeviceRepository deviceRepo;
    private final BiometricEmployeeRepository mappingRepo;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceActivityRepository activityRepository;
    private final AttendanceService attendanceService;

    /**
     * Process ATTLOG push data from a device identified by serial number.
     */
    @Transactional
    public void processAttlogPush(String serialNumber, String content) {
        log.info("ADMS push received - SN={}, content_length={}", serialNumber, content.length());

        // 1. Find device by serial number
        BiometricDevice device = deviceRepo.findBySerialNumberAndIsActiveTrue(serialNumber)
                .orElse(null);

        if (device == null) {
            log.warn("ADMS push from unknown serial '{}' - no matching active device", serialNumber);
            return;
        }

        // 2. Parse ATTLOG punch records
        List<PunchRecord> records = parseAttlog(content);
        if (records.isEmpty()) {
            log.debug("ADMS: no valid records parsed from SN={}", serialNumber);
            return;
        }

        // 3. Build employee mapping cache for this device (user_id → BiometricEmployee)
        Map<String, BiometricEmployee> bioMap = new HashMap<>();
        mappingRepo.findByDeviceIdAndIsActiveTrue(device.getId())
                .forEach(m -> bioMap.put(m.getUserId(), m));

        // 4. Process each punch record
        int processed = 0;
        for (PunchRecord rec : records) {
            try {
                BiometricEmployee mapping = bioMap.get(rec.userId);
                if (mapping == null) {
                    log.debug("ADMS: no mapping for user_id='{}' on device '{}' (SN={})",
                            rec.userId, device.getName(), serialNumber);
                    continue;
                }

                Employee employee = mapping.getEmployee();
                if (employee == null) {
                    log.warn("ADMS: mapping found but employee is null for user_id='{}' on device '{}'",
                            rec.userId, device.getName());
                    continue;
                }

                String punchDir = resolvePunchDirection(rec.status, device.getDeviceDirection());

                // Device records times in its local timezone
                ZonedDateTime punchZdt = rec.punchTime.atZone(DEVICE_TIMEZONE);
                LocalDate punchDate = punchZdt.toLocalDate();
                LocalTime punchTime = punchZdt.toLocalTime();
                Instant punchInstant = punchZdt.toInstant();

                log.info("ADMS PUNCH: device='{}' user_id='{}' employee='{}' (ID={}) dir={} time={}",
                        device.getName(), rec.userId,
                        employee.getFirstName() + " " + employee.getLastName(),
                        employee.getId(), punchDir, punchZdt);

                if ("in".equals(punchDir)) {
                    processClockIn(employee, punchDate, punchTime, punchInstant, device);
                } else {
                    processClockOut(employee, punchDate, punchTime, punchInstant, device);
                }

                processed++;

            } catch (Exception e) {
                log.error("ADMS: failed to process punch for user_id='{}' on device '{}': {}",
                        rec.userId, device.getName(), e.getMessage(), e);
            }
        }

        log.info("ADMS push from device '{}' (SN={}): {} records received, {} processed",
                device.getName(), serialNumber, records.size(), processed);
    }

    /**
     * Process a clock-in punch from a biometric device.
     * Creates AttendanceActivity and updates the daily Attendance summary.
     */
    private void processClockIn(Employee employee, LocalDate punchDate, LocalTime punchTime,
                                 Instant punchInstant, BiometricDevice device) {
        Long employeeId = employee.getId();

        // Check if there's already an open activity (clocked in but not out) for today
        List<AttendanceActivity> activities = activityRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, punchDate);
        boolean hasOpenActivity = activities.stream().anyMatch(a -> a.getClockOut() == null);

        if (hasOpenActivity) {
            log.debug("ADMS: employee {} already has open activity for {} - skipping duplicate clock-in",
                    employeeId, punchDate);
            return;
        }

        // Create new AttendanceActivity for this punch
        AttendanceActivity activity = new AttendanceActivity();
        activity.setEmployee(employee);
        activity.setAttendanceDate(punchDate);
        activity.setClockIn(punchTime);
        activity.setClockInDate(punchDate);
        activity.setInDatetime(LocalDateTime.of(punchDate, punchTime));
        activityRepository.save(activity);

        // Find or create the daily Attendance summary record
        Attendance att = attendanceRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, punchDate)
                .orElseGet(() -> {
                    Attendance newAtt = new Attendance();
                    newAtt.setEmployee(employee);
                    newAtt.setCompany(employee.getCompany());
                    newAtt.setAttendanceDate(punchDate);
                    newAtt.setAttendanceValidated(Attendance.AttendanceStatus.PENDING);
                    // Set shift if employee has one assigned
                    ShiftSchedule shift = employee.getShift();
                    if (shift != null) {
                        newAtt.setShift(shift);
                        if (shift.getMinimumWorkingHour() != null) {
                            newAtt.setMinimumHour(shift.getMinimumWorkingHour() / 60.0);
                        }
                    }
                    return attendanceRepository.save(newAtt);
                });

        // Update first check-in of the day if not already set
        if (att.getCheckIn() == null) {
            att.setCheckIn(punchTime);
            att.setCheckInDate(punchDate);
            att.setCheckInUtc(punchInstant);
            att.setClockInDeviceName(device.getName());
            att.setClockInSource("device");
            attendanceRepository.save(att);
        }
    }

    /**
     * Process a clock-out punch from a biometric device.
     * Closes the open AttendanceActivity and updates the daily Attendance summary.
     */
    private void processClockOut(Employee employee, LocalDate punchDate, LocalTime punchTime,
                                  Instant punchInstant, BiometricDevice device) {
        Long employeeId = employee.getId();

        // Find the open activity for today and close it
        List<AttendanceActivity> activities = activityRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, punchDate);
        AttendanceActivity openActivity = activities.stream()
                .filter(a -> a.getClockOut() == null)
                .findFirst()
                .orElse(null);

        if (openActivity != null) {
            openActivity.setClockOut(punchTime);
            openActivity.setClockOutDate(punchDate);
            openActivity.setOutDatetime(LocalDateTime.of(punchDate, punchTime));
            activityRepository.save(openActivity);
        } else {
            log.debug("ADMS: no open activity for employee {} on {} - creating standalone clock-out",
                    employeeId, punchDate);
        }

        // Find or create the daily Attendance summary
        Attendance att = attendanceRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, punchDate)
                .orElseGet(() -> {
                    Attendance newAtt = new Attendance();
                    newAtt.setEmployee(employee);
                    newAtt.setCompany(employee.getCompany());
                    newAtt.setAttendanceDate(punchDate);
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

        // Always update clock-out to the latest punch (last out wins)
        att.setCheckOut(punchTime);
        att.setCheckOutDate(punchDate);
        att.setCheckOutUtc(punchInstant);
        att.setClockOutDeviceName(device.getName());
        att.setClockOutSource("device");
        attendanceRepository.save(att);

        // Trigger the existing worked-hours computation, overtime detection, and WorkRecord generation
        try {
            attendanceService.computeWorkedHours(att.getId());
        } catch (Exception e) {
            log.warn("ADMS: failed to compute worked hours for attendance id={}: {}",
                    att.getId(), e.getMessage());
        }
    }

    /**
     * Parse ATTLOG content into a list of PunchRecord objects.
     * Each line: USER_ID\tDATETIME\tSTATUS\tVERIFY_TYPE\tWORK_CODE\tRESERVED
     */
    private List<PunchRecord> parseAttlog(String content) {
        List<PunchRecord> records = new ArrayList<>();
        for (String line : content.strip().split("\n")) {
            String trimmed = line.strip();
            if (trimmed.isEmpty()) continue;

            String[] parts = trimmed.split("\t");
            if (parts.length < 2) {
                log.debug("ADMS: skipping malformed ATTLOG line (< 2 fields): {}", trimmed);
                continue;
            }

            try {
                PunchRecord rec = new PunchRecord();
                rec.userId = parts[0].strip();
                rec.punchTime = LocalDateTime.parse(parts[1].strip(), PUNCH_TIME_FORMAT);
                rec.status = parts.length > 2 ? Integer.parseInt(parts[2].strip()) : 0;
                records.add(rec);
            } catch (Exception e) {
                log.warn("ADMS: could not parse ATTLOG line: '{}' - {}", trimmed, e.getMessage());
            }
        }
        return records;
    }

    /**
     * Resolve the punch direction based on the status code and device direction setting.
     *
     * Device direction modes:
     *   IN        → all punches are clock-in
     *   OUT       → all punches are clock-out
     *   ALTERNATE → status 0,2,4 = in; status 1,3,5 = out (ZKTeco standard)
     *   SYSTEM    → same as ALTERNATE (default)
     */
    private String resolvePunchDirection(int status, BiometricDevice.DeviceDirection direction) {
        if (direction == BiometricDevice.DeviceDirection.IN) return "in";
        if (direction == BiometricDevice.DeviceDirection.OUT) return "out";
        // ALTERNATE or SYSTEM: even codes = in, odd codes = out
        return CLOCK_IN_CODES.contains(status) ? "in" : "out";
    }

    /**
     * Log device info string sent during handshake.
     * Format: Ver=X.X.X,UserCount=N,FPCount=N,TransactionCount=N,...
     */
    public void logDeviceInfo(String serialNumber, String info) {
        log.info("ADMS device info - SN={} INFO={}", serialNumber, info);
    }

    /**
     * Internal record class for parsed ATTLOG punch data.
     */
    static class PunchRecord {
        String userId;
        LocalDateTime punchTime;
        int status;
    }
}
