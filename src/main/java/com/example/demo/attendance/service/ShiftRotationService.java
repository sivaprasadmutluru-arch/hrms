package com.example.demo.attendance.service;

import com.example.demo.base.entity.RotatingShiftAssign;
import com.example.demo.base.entity.RotatingShift;
import com.example.demo.base.entity.ShiftRequest;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.repository.RotatingShiftAssignRepository;
import com.example.demo.base.repository.ShiftRequestRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.employee.entity.EmployeeWorkInformation;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftRotationService {

    private final RotatingShiftAssignRepository rotatingShiftAssignRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final ShiftRequestRepository shiftRequestRepository;
    private final EmployeeWorkInformationRepository workInfoRepository;

    /**
     * Applies rotation to a RotatingShiftAssign:
     * - Advances through the full shift list (shift1, shift2, ...additional) using nextShiftIndex
     * - Updates the employee's EmployeeWorkInformation.shift to the newly active shift
     * - Advances nextChangeDate
     */
    @Transactional
    public RotatingShiftAssign applyRotation(RotatingShiftAssign assign) {
        RotatingShift rs = assign.getRotatingShift();
        if (rs == null) return assign;

        List<ShiftSchedule> allShifts = buildShiftList(rs);
        if (allShifts.isEmpty()) return assign;

        int index = assign.getNextShiftIndex() != null ? assign.getNextShiftIndex() : 0;
        if (index >= allShifts.size()) index = 0;

        ShiftSchedule newCurrent = allShifts.get(index);
        assign.setCurrentShift(newCurrent);

        int nextIndex = (index + 1) % allShifts.size();
        assign.setNextShiftIndex(nextIndex);
        assign.setNextShift(allShifts.get(nextIndex));

        // Advance next change date
        LocalDate base = assign.getNextChangeDate() != null ? assign.getNextChangeDate() : LocalDate.now();
        assign.setNextChangeDate(computeNextChangeDate(base, assign));

        // Update employee's actual work info shift
        workInfoRepository.findByEmployeeId(assign.getEmployee().getId()).ifPresent(workInfo -> {
            workInfo.setShift(newCurrent);
            workInfoRepository.save(workInfo);
        });

        return rotatingShiftAssignRepository.save(assign);
    }

    /**
     * Applies all approved shift requests whose requestedDate == today and shift has not yet been changed.
     * Runs daily (switch_shift scheduler).
     */
    @Transactional
    public void switchPendingShiftRequests() {
        LocalDate today = LocalDate.now();
        List<ShiftRequest> pending = shiftRequestRepository.findApprovedPendingSwitch(today);
        for (ShiftRequest req : pending) {
            try {
                workInfoRepository.findByEmployeeId(req.getEmployee().getId()).ifPresent(workInfo -> {
                    workInfo.setShift(req.getRequestedShift());
                    workInfoRepository.save(workInfo);
                });
                // Handle reallocation swap
                if (req.getReallocateTo() != null && req.getPreviousShift() != null) {
                    workInfoRepository.findByEmployeeId(req.getReallocateTo().getId()).ifPresent(workInfo -> {
                        workInfo.setShift(req.getPreviousShift());
                        workInfoRepository.save(workInfo);
                    });
                }
                req.setShiftChanged(true);
                shiftRequestRepository.save(req);
                log.info("switchShift: applied shift for employee {}", req.getEmployee().getId());
            } catch (Exception e) {
                log.error("switchShift failed for request {}: {}", req.getId(), e.getMessage());
            }
        }
    }

    /**
     * Reverts all temporary shift requests that have expired (requestedTill < today).
     * Restores employee shift to previousShift.
     * Runs daily (undo_shift scheduler).
     */
    @Transactional
    public void undoExpiredShiftRequests() {
        LocalDate today = LocalDate.now();
        List<ShiftRequest> expired = shiftRequestRepository.findExpiredActiveShiftRequests(today);
        for (ShiftRequest req : expired) {
            try {
                if (req.getPreviousShift() != null) {
                    workInfoRepository.findByEmployeeId(req.getEmployee().getId()).ifPresent(workInfo -> {
                        workInfo.setShift(req.getPreviousShift());
                        workInfoRepository.save(workInfo);
                    });
                }
                req.setIsActive(false);
                shiftRequestRepository.save(req);
                log.info("undoShift: reverted shift for employee {}", req.getEmployee().getId());
            } catch (Exception e) {
                log.error("undoShift failed for request {}: {}", req.getId(), e.getMessage());
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private List<ShiftSchedule> buildShiftList(RotatingShift rs) {
        List<ShiftSchedule> shifts = new ArrayList<>();
        if (rs.getShift1() != null) shifts.add(rs.getShift1());
        if (rs.getShift2() != null) shifts.add(rs.getShift2());
        for (Long id : rs.getAdditionalShiftIdList()) {
            shiftScheduleRepository.findById(id).ifPresent(shifts::add);
        }
        return shifts;
    }

    public static LocalDate computeNextChangeDate(LocalDate base, RotatingShiftAssign assign) {
        int count = assign.getRotateAfterEveryCount() != null ? assign.getRotateAfterEveryCount() : 1;
        if (assign.getRotateAfterEvery() == null) {
            int days = assign.getRotateAfterDay() != null ? assign.getRotateAfterDay() : 7;
            return base.plusDays(days);
        }
        return switch (assign.getRotateAfterEvery()) {
            case DAYS -> base.plusDays(count);
            case WEEKS -> {
                LocalDate next = base.plusWeeks(count);
                String weekday = assign.getRotateEveryWeekend();
                if (weekday != null && !weekday.isBlank()) {
                    try {
                        DayOfWeek dow = DayOfWeek.valueOf(weekday.toUpperCase());
                        yield next.with(TemporalAdjusters.nextOrSame(dow));
                    } catch (IllegalArgumentException ignored) {}
                }
                yield next;
            }
            case MONTHS -> base.plusMonths(count);
        };
    }
}
