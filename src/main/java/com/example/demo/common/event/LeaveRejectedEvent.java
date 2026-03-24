package com.example.demo.common.event;

import com.example.demo.leave.entity.LeaveRequest;
import lombok.Getter;

/**
 * Published when a leave request is rejected.
 */
@Getter
public class LeaveRejectedEvent extends HrmsEvent {

    private final LeaveRequest leaveRequest;
    private final String reason;

    public LeaveRejectedEvent(Object source, LeaveRequest leaveRequest, String reason) {
        super(source,
                leaveRequest.getCompany() != null ? leaveRequest.getCompany().getId() : null,
                leaveRequest.getEmployee() != null ? leaveRequest.getEmployee().getId() : null);
        this.leaveRequest = leaveRequest;
        this.reason = reason;
    }
}
