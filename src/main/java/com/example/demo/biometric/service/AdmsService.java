package com.example.demo.biometric.service;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceActivity;
import com.example.demo.attendance.repository.AttendanceActivityRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.base.entity.Company;
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
    private static final Set<Integer> CLOCK_IN_CODES = Set.of(0, 3, 4);

    private final BiometricDeviceRepository deviceRepo;
    private final BiometricEmployeeRepository mappingRepo;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceActivityRepository activityRepository;
    private final AttendanceService attendanceService;
    private final com.example.demo.biometric.repository.BiometricPunchReceiptRepository receipts;

    /**
     * Process ATTLOG push data from a device identified by serial number.
     */
    @Transactional
    public void processAttlogPush(String serialNumber, String content) {
        log.info("ADMS push received - SN={}, content_length={}", serialNumber, content.length());

        // 1. Find device by serial number
        BiometricDevice device = deviceRepo.lockActiveDevice(serialNumber)
                .orElse(null);

        if (device == null) {
            log.warn("ADMS push from unknown serial '{}' - no matching active device", serialNumber);
            return;
        }

        // 2. Parse ATTLOG punch records
        List<PunchRecord> records = parseAttlog(content);
        records.sort(Comparator.comparing(r -> r.punchTime));
        if (records.isEmpty()) {
            log.debug("ADMS: no valid records parsed from SN={}", serialNumber);
            return;
        }

        // 3. Build employee mapping cache for this device (user_id → BiometricEmployee)
        Map<String, BiometricEmployee> bioMap = new HashMap<>();
        mappingRepo.findByDeviceIdAndIsActiveTrue(device.getId())
                .forEach(m -> {
                    if (bioMap.containsKey(m.getUserId())) bioMap.put(m.getUserId(), null);
                    else bioMap.put(m.getUserId(), m);
                });

        // 4. Process each punch record
        int processed = 0;
        for (PunchRecord rec : records) {
            try {
                var receipt = receipts.findByFingerprint(fingerprint(serialNumber, rec)).orElseGet(() -> {
                    var r = new com.example.demo.biometric.entity.BiometricPunchReceipt();
                    r.setFingerprint(fingerprint(serialNumber, rec)); r.setSerialNumber(serialNumber);
                    r.setDeviceUserId(rec.userId); r.setDeviceTime(rec.punchTime); r.setDeviceStatus(rec.status);
                    r.setProcessingState("RECEIVED"); return receipts.save(r);
                });
                if ("PROCESSED".equals(receipt.getProcessingState())) continue;
                BiometricEmployee mapping = resolveEmployeeMapping(device, rec.userId, bioMap);
                if (mapping == null) {
                    receipt.setProcessingState("UNMAPPED");
                    receipt.setDetail("Explicit active device/user mapping required"); receipts.save(receipt);
                    log.warn("ADMS: no unique device mapping for user_id='{}' on device '{}' (SN={}); punch retained",
                            rec.userId, device.getName(), serialNumber);
                    continue;
                }

                Employee employee = mapping.getEmployee();
                if (employee == null || !employee.isActive() || !isSameOrganization(device.getCompany(), employee.getCompany())) {
                    receipt.setProcessingState("INVALID_MAPPING"); receipts.save(receipt);
                    log.warn("ADMS: mapping found but employee is null for user_id='{}' on device '{}'",
                            rec.userId, device.getName());
                    continue;
                }

                String punchDir = resolvePunchDirection(rec.status, device.getDeviceDirection());
                receipt.setEmployeeId(employee.getId());
                if (punchDir == null) {
                    receipt.setProcessingState("UNKNOWN_STATUS"); receipts.save(receipt); continue;
                }

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
                receipt.setEmployeeId(employee.getId()); receipt.setProcessingState("PROCESSED"); receipts.save(receipt);

            } catch (Exception e) {
                log.error("ADMS: failed to process punch for user_id='{}' on device '{}': {}",
                        rec.userId, device.getName(), e.getMessage(), e);
                throw new IllegalStateException("Punch batch failed; transaction rolled back for device retry", e);
            }
        }

        log.info("ADMS push from device '{}' (SN={}): {} records received, {} processed",
                device.getName(), serialNumber, records.size(), processed);
    }

    /**
     * Numeric IDs are terminal-local. Visiting employees require an explicit mapping on that terminal.
     */
    private BiometricEmployee resolveEmployeeMapping(BiometricDevice device, String userId,
                                                       Map<String, BiometricEmployee> deviceMappings) {
        return deviceMappings.get(userId);
    }

    private String fingerprint(String serial, PunchRecord record) {
        try {
            byte[] bytes = (serial + "|" + record.userId + "|" + record.punchTime + "|" + record.status)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private boolean isSameOrganization(Company deviceCompany, Company employeeCompany) {
        if (deviceCompany == null || employeeCompany == null) return false;

        if (deviceCompany.getOrganization() != null && employeeCompany.getOrganization() != null) {
            return Objects.equals(deviceCompany.getOrganization().getId(), employeeCompany.getOrganization().getId());
        }

        // Compatibility for legacy company rows without organization_id: compare their HO roots.
        Long deviceRootId = deviceCompany.isHeadOffice() ? deviceCompany.getId() : deviceCompany.getParentCompanyId();
        Long employeeRootId = employeeCompany.isHeadOffice() ? employeeCompany.getId() : employeeCompany.getParentCompanyId();
        return deviceRootId != null && Objects.equals(deviceRootId, employeeRootId);
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
        if (activities.stream().anyMatch(a -> punchTime.equals(a.getClockIn()))) return;
        boolean hasOpenActivity = activities.stream().anyMatch(a -> a.getClockOut() == null);

        if (hasOpenActivity) {
            AttendanceActivity earliest = activities.stream().filter(a -> a.getClockOut() == null)
                    .filter(a -> a.getClockIn() != null).min(Comparator.comparing(AttendanceActivity::getClockIn)).orElse(null);
            if (earliest != null && punchTime.isBefore(earliest.getClockIn())) {
                earliest.setClockIn(punchTime);
                earliest.setInDatetime(LocalDateTime.of(punchDate, punchTime));
                activityRepository.save(earliest);
                attendanceRepository.findByEmployeeIdAndAttendanceDate(employeeId, punchDate).ifPresent(att -> {
                    if (att.getCheckIn() == null || punchTime.isBefore(att.getCheckIn())) {
                        att.setCheckIn(punchTime); att.setCheckInDate(punchDate); att.setCheckInUtc(punchInstant);
                        att.setClockInDeviceName(device.getName()); att.setClockInSource("device");
                        attendanceRepository.save(att);
                    }
                });
            }
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
                    // attendanceStatus defaults to REGULAR; evaluated on checkout
                    // Set shift if employee has one assigned
                    ShiftSchedule shift = employee.getShift();
                    if (shift != null) {
                        newAtt.setShift(shift);
                        if (shift.getMinimumWorkingHour() != null) {
                            newAtt.setMinimumHour(normalizeMinimumWorkingHours(shift.getMinimumWorkingHour()));
                        }
                    }
                    return attendanceRepository.save(newAtt);
                });

        // Update first check-in of the day if not already set
        if (att.getCheckIn() == null || punchTime.isBefore(att.getCheckIn())) {
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
                .filter(a -> a.getClockIn() != null && !a.getClockIn().isAfter(punchTime))
                .max(Comparator.comparing(AttendanceActivity::getClockIn))
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
                    // attendanceStatus defaults to REGULAR; evaluated on checkout
                    ShiftSchedule shift = employee.getShift();
                    if (shift != null) {
                        newAtt.setShift(shift);
                        if (shift.getMinimumWorkingHour() != null) {
                            newAtt.setMinimumHour(normalizeMinimumWorkingHours(shift.getMinimumWorkingHour()));
                        }
                    }
                    return attendanceRepository.save(newAtt);
                });

        // Always update clock-out to the latest punch (last out wins)
        if (att.getCheckOutUtc() != null && !punchInstant.isAfter(att.getCheckOutUtc())) {
            if (openActivity != null) attendanceService.computeWorkedHours(att.getId());
            return;
        }
        att.setCheckOut(punchTime);
        att.setCheckOutDate(punchDate);
        att.setCheckOutUtc(punchInstant);
        att.setClockOutDeviceName(device.getName());
        att.setClockOutSource("device");
        attendanceRepository.save(att);

        // Trigger the existing worked-hours computation, overtime detection, and WorkRecord generation
        attendanceService.computeWorkedHours(att.getId());
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
                throw new IllegalArgumentException("Malformed ATTLOG batch; device retry required");
            }

            try {
                PunchRecord rec = new PunchRecord();
                rec.userId = parts[0].strip();
                if (rec.userId.isEmpty()) throw new IllegalArgumentException("Missing device user ID");
                rec.punchTime = LocalDateTime.parse(parts[1].strip(), PUNCH_TIME_FORMAT);
                rec.status = parts.length > 2 ? Integer.parseInt(parts[2].strip()) : -1;
                records.add(rec);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid ATTLOG timestamp/status; device retry required", e);
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
     *   ALTERNATE → status 0,3,4 = in; status 1,2,5 = out
     *   SYSTEM    → same as ALTERNATE (default)
     */
    private String resolvePunchDirection(int status, BiometricDevice.DeviceDirection direction) {
        if (direction == BiometricDevice.DeviceDirection.IN) return "in";
        if (direction == BiometricDevice.DeviceDirection.OUT) return "out";
        if (status < 0 || status > 5) return null;
        return CLOCK_IN_CODES.contains(status) ? "in" : "out";
    }

    /** Current UI stores hours; older installations stored minutes, and some stored seconds. */
    private static double normalizeMinimumWorkingHours(Integer configuredValue) {
        if (configuredValue == null || configuredValue <= 0) return 0.0;
        if (configuredValue <= 24) return configuredValue.doubleValue();
        if (configuredValue <= 24 * 60) return configuredValue / 60.0;
        return configuredValue / 3600.0;
    }

    /**
     * Log device info string sent during handshake.
     * Format: Ver=X.X.X,UserCount=N,FPCount=N,TransactionCount=N,...
     */
    public void logDeviceInfo(String serialNumber, String info) {
        log.info("ADMS device info - SN={} INFO={}", serialNumber, info);
    }

    /** Record the last successful ADMS poll from a physical device. */
    @Transactional
    public void recordHeartbeat(String serialNumber, String info) {
        deviceRepo.findBySerialNumberAndIsActiveTrue(serialNumber).ifPresentOrElse(device -> {
            ZonedDateTime now = ZonedDateTime.now(DEVICE_TIMEZONE);
            device.setLastFetchDate(now.toLocalDate());
            device.setLastFetchTime(now.toLocalTime().withNano(0));
            device.setLive(true);
            deviceRepo.save(device);
            if (info != null && !info.isBlank()) {
                logDeviceInfo(serialNumber, info);
            } else {
                log.info("ADMS heartbeat - SN={} device='{}'", serialNumber, device.getName());
            }
        }, () -> log.warn("ADMS heartbeat from unknown serial '{}'", serialNumber));
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
