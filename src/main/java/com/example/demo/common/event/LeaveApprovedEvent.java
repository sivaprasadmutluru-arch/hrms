package com.example.demo.common.event;

import com.example.demo.leave.entity.LeaveRequest;
import lombok.Getter;

/**
 * Published when a leave request is approved.
 * Listeners can send notification emails, update dashboards, etc.
 */
@Getter
public class LeaveApprovedEvent extends HrmsEvent {

    private final LeaveRequest leaveRequest;

    public LeaveApprovedEvent(Object source, LeaveRequest leaveRequest) {
        super(source,
                leaveRequest.getCompany() != null ? leaveRequest.getCompany().getId() : null,
                leaveRequest.getEmployee() != null ? leaveRequest.getEmployee().getId() : null);
        this.leaveRequest = leaveRequest;
    }
}
