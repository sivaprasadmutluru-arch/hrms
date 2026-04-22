package com.example.demo.leave.service;

import com.example.demo.attendance.entity.WorkRecord;
import com.example.demo.attendance.repository.WorkRecordRepository;
import com.example.demo.common.event.LeaveApprovedEvent;
import com.example.demo.common.event.LeaveRejectedEvent;
import com.example.demo.leave.entity.LeaveRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveEventHandler {

    private final WorkRecordRepository workRecordRepository;

    @EventListener
    @Transactional
    public void onLeaveApproved(LeaveApprovedEvent event) {
        LeaveRequest req = event.getLeaveRequest();
        log.info("Leave approved: employeeId={}, leaveType={}, days={}, period={} to {}",
                event.getEmployeeId(),
                req.getLeaveType() != null ? req.getLeaveType().getName() : "?",
                req.getRequestedDays(),
                req.getStartDate(),
                req.getEndDate());

        // FIX #11: create WorkRecord entries (type=LEA) for each working day in the leave period
        // so payroll and attendance reports correctly reflect approved leave days
        if (req.getStartDate() == null || req.getEndDate() == null || req.getEmployee() == null) return;

        String leaveName = req.getLeaveType() != null ? req.getLeaveType().getName() : "Leave";
        LocalDate d = req.getStartDate();
        while (!d.isAfter(req.getEndDate())) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                final LocalDate date = d;
                List<WorkRecord> existing = workRecordRepository.findByEmployeeIdAndDate(
                        req.getEmployee().getId(), date);

                WorkRecord wr = existing.stream()
                        .filter(r -> Boolean.TRUE.equals(r.getIsLeaveRecord()))
                        .findFirst()
                        .orElseGet(WorkRecord::new);

                wr.setEmployee(req.getEmployee());
                wr.setCompany(req.getCompany());
                wr.setDate(date);
                wr.setWorkRecordType(WorkRecord.WorkRecordType.LEA);
                wr.setDayPercentage(1.0);
                wr.setIsLeaveRecord(true);
                wr.setIsAttendanceRecord(false);
                wr.setAtWork("00:00");
                wr.setAtWorkSecond(0);
                wr.setNote(leaveName);
                wr.setLastUpdate(LocalDateTime.now());
                workRecordRepository.save(wr);
            }
            d = d.plusDays(1);
        }
    }

    @EventListener
    public void onLeaveRejected(LeaveRejectedEvent event) {
        LeaveRequest req = event.getLeaveRequest();
        log.info("Leave rejected: employeeId={}, leaveType={}, reason={}",
                event.getEmployeeId(),
                req.getLeaveType() != null ? req.getLeaveType().getName() : "?",
                req.getRejectReason());
    }
}
