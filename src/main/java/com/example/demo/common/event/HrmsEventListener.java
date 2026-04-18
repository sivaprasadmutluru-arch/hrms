package com.example.demo.common.event;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.hrpolicy.entity.HrPolicy;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.service.NotificationService;
import com.example.demo.payroll.entity.Payslip;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final NotificationService notificationService;
    private final UserRoleRepository userRoleRepository;
    private final CompanyRepository companyRepository;

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

    @Async
    @EventListener
    public void onPolicyPublished(PolicyPublishedEvent event) {
        HrPolicy policy = event.getPolicy();
        Company company = policy.getCompany();
        if (company == null) return;

        // Determine which company IDs to notify
        List<Long> companyIds;
        if (Boolean.TRUE.equals(policy.getIsOrganizationWide()) && company.getOrganization() != null) {
            // Notify all companies in the same organization
            companyIds = companyRepository.findByOrganizationId(company.getOrganization().getId())
                    .stream().map(Company::getId).collect(Collectors.toList());
        } else {
            companyIds = List.of(company.getId());
        }

        // Collect unique user IDs across all target companies
        List<Long> userIds = userRoleRepository.findByCompanyIdIn(companyIds).stream()
                .map(ur -> ur.getUser().getId())
                .distinct()
                .collect(Collectors.toList());

        String title = "New Policy: " + policy.getTitle();
        String message = "A new company policy has been published. Please review it in the Policies section.";

        for (Long userId : userIds) {
            try {
                notificationService.send(userId, title, message,
                        Notification.NotificationType.POLICY_PUBLISHED,
                        "HrPolicy", policy.getId(), company);
            } catch (Exception e) {
                log.warn("Failed to send policy notification to user {}: {}", userId, e.getMessage());
            }
        }
    }
}
