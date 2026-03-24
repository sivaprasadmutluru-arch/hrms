package com.example.demo.common.event;

import com.example.demo.base.service.EmailService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.payroll.entity.Payslip;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Central event listener for HRMS domain events.
 * Handles cross-cutting concerns like email notifications.
 * All handlers are async to avoid blocking the publishing thread.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HrmsEventListener {

    private final EmailService emailService;

    @Async
    @EventListener
    public void onLeaveApproved(LeaveApprovedEvent event) {
        LeaveRequest req = event.getLeaveRequest();
        Employee employee = req.getEmployee();
        if (employee == null || employee.getEmail() == null) return;

        Map<String, String> vars = new HashMap<>();
        vars.put("employeeName", employee.getFirstName() + " " + employee.getLastName());
        vars.put("leaveType", req.getLeaveType() != null ? req.getLeaveType().getName() : "Leave");
        vars.put("startDate", req.getStartDate() != null ? req.getStartDate().toString() : "");
        vars.put("endDate", req.getEndDate() != null ? req.getEndDate().toString() : "");

        try {
            emailService.sendFromTemplate(event.getCompanyId(), "LEAVE_APPROVED",
                    employee.getEmail(), vars, employee);
        } catch (Exception e) {
            log.warn("Failed to send leave approval email for request {}: {}", req.getId(), e.getMessage());
        }
    }

    @Async
    @EventListener
    public void onLeaveRejected(LeaveRejectedEvent event) {
        LeaveRequest req = event.getLeaveRequest();
        Employee employee = req.getEmployee();
        if (employee == null || employee.getEmail() == null) return;

        Map<String, String> vars = new HashMap<>();
        vars.put("employeeName", employee.getFirstName() + " " + employee.getLastName());
        vars.put("leaveType", req.getLeaveType() != null ? req.getLeaveType().getName() : "Leave");
        vars.put("startDate", req.getStartDate() != null ? req.getStartDate().toString() : "");
        vars.put("endDate", req.getEndDate() != null ? req.getEndDate().toString() : "");
        vars.put("reason", event.getReason() != null ? event.getReason() : "No reason provided");

        try {
            emailService.sendFromTemplate(event.getCompanyId(), "LEAVE_REJECTED",
                    employee.getEmail(), vars, employee);
        } catch (Exception e) {
            log.warn("Failed to send leave rejection email for request {}: {}", req.getId(), e.getMessage());
        }
    }

    @Async
    @EventListener
    public void onPayslipGenerated(PayslipGeneratedEvent event) {
        Payslip payslip = event.getPayslip();
        Employee employee = payslip.getEmployee();
        if (employee == null || employee.getEmail() == null) return;

        Map<String, String> vars = new HashMap<>();
        vars.put("employeeName", employee.getFirstName() + " " + employee.getLastName());
        vars.put("period", payslip.getStartDate() + " to " + payslip.getEndDate());
        vars.put("netPay", payslip.getNetPay() != null ? payslip.getNetPay().toPlainString() : "0");

        try {
            emailService.sendFromTemplate(event.getCompanyId(), "PAYSLIP_GENERATED",
                    employee.getEmail(), vars, employee);
        } catch (Exception e) {
            log.warn("Failed to send payslip notification for payslip {}: {}", payslip.getId(), e.getMessage());
        }
    }
}
