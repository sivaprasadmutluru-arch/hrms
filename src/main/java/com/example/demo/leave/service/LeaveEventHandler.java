package com.example.demo.leave.service;

import com.example.demo.common.event.LeaveApprovedEvent;
import com.example.demo.common.event.LeaveRejectedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LeaveEventHandler {

    @EventListener
    public void onLeaveApproved(LeaveApprovedEvent event) {
        var req = event.getLeaveRequest();
        log.info("Leave approved: employeeId={}, leaveType={}, days={}, period={} to {}",
                event.getEmployeeId(),
                req.getLeaveType() != null ? req.getLeaveType().getName() : "?",
                req.getRequestedDays(),
                req.getStartDate(),
                req.getEndDate());
    }

    @EventListener
    public void onLeaveRejected(LeaveRejectedEvent event) {
        var req = event.getLeaveRequest();
        log.info("Leave rejected: employeeId={}, leaveType={}, reason={}",
                event.getEmployeeId(),
                req.getLeaveType() != null ? req.getLeaveType().getName() : "?",
                req.getRejectReason());
    }
}
