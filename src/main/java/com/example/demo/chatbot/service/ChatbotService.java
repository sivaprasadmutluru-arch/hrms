package com.example.demo.chatbot.service;

import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import com.example.demo.attendance.repository.AttendanceRegularisationRequestRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.Holiday;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.HolidayRepository;
import com.example.demo.payroll.entity.LoanRequest;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.entity.Reimbursement;
import com.example.demo.payroll.repository.LoanRequestRepository;
import com.example.demo.payroll.repository.PayslipRepository;
import com.example.demo.payroll.repository.ReimbursementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Answers a small, fixed set of self-service questions using the asking employee's own real
 * data — not a free-form/NLP chatbot. The frontend presents these as suggested-question buttons
 * mapped directly to an Intent, which keeps answers deterministic and avoids misclassification.
 */
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final EmployeeRepository employeeRepository;
    private final AvailableLeaveRepository availableLeaveRepository;
    private final PayslipRepository payslipRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceRegularisationRequestRepository regularisationRequestRepository;
    private final LoanRequestRepository loanRequestRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final HolidayRepository holidayRepository;

    public enum Intent {
        LEAVE_BALANCE, LATEST_PAYSLIP, ATTENDANCE_TODAY, PENDING_REGULARISATION, PENDING_LOAN,
        PENDING_REIMBURSEMENT, NEXT_HOLIDAY
    }

    @Transactional(readOnly = true)
    public String answer(String intentName, Long userId) {
        Intent intent;
        try {
            intent = Intent.valueOf(intentName);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BadRequestException("Unknown question: " + intentName);
        }

        // Admin-only accounts (no linked Employee profile) can't have leave/payslip/attendance
        // data of their own — answer gracefully instead of erroring, since the widget shows for
        // every logged-in user regardless of role.
        Employee employee = employeeRepository.findByUserId(userId).orElse(null);
        if (employee == null) {
            return "This assistant answers questions about your own employee record (leave, payslips, "
                    + "attendance, requests), and this account isn't linked to an employee profile.";
        }

        return switch (intent) {
            case LEAVE_BALANCE -> leaveBalanceAnswer(employee);
            case LATEST_PAYSLIP -> latestPayslipAnswer(employee);
            case ATTENDANCE_TODAY -> attendanceTodayAnswer(employee);
            case PENDING_REGULARISATION -> pendingRegularisationAnswer(employee);
            case PENDING_LOAN -> pendingLoanAnswer(employee);
            case PENDING_REIMBURSEMENT -> pendingReimbursementAnswer(employee);
            case NEXT_HOLIDAY -> nextHolidayAnswer(employee);
        };
    }

    private String leaveBalanceAnswer(Employee employee) {
        List<AvailableLeave> balances = availableLeaveRepository.findByEmployeeId(employee.getId());
        if (balances.isEmpty()) {
            return "You don't have any leave balance set up yet — check with HR.";
        }
        StringBuilder sb = new StringBuilder("Here's your current leave balance:\n");
        for (AvailableLeave b : balances) {
            double days = b.getTotalLeaveDays() != null ? b.getTotalLeaveDays() : 0.0;
            sb.append(String.format("- %s: %.1f day%s%n",
                    b.getLeaveType() != null ? b.getLeaveType().getName() : "Unknown",
                    days, days == 1.0 ? "" : "s"));
        }
        return sb.toString().trim();
    }

    private String latestPayslipAnswer(Employee employee) {
        List<Payslip> payslips = payslipRepository.findByEmployeeId(employee.getId());
        Payslip latest = payslips.stream()
                .filter(p -> p.getStartDate() != null)
                .max(Comparator.comparing(Payslip::getStartDate))
                .orElse(null);
        if (latest == null) {
            return "You don't have any payslips yet.";
        }
        String period = latest.getEndDate() != null
                ? latest.getStartDate() + " to " + latest.getEndDate()
                : latest.getStartDate().toString();
        return String.format("Your latest payslip covers %s — status: %s, net pay: %.2f.",
                period, latest.getStatus(), latest.getNetPay() != null ? latest.getNetPay() : 0);
    }

    private String attendanceTodayAnswer(Employee employee) {
        return attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), LocalDate.now())
                .map(a -> {
                    if (a.getCheckIn() != null && a.getCheckOut() == null) {
                        return "You checked in today at " + a.getCheckIn() + " and haven't checked out yet.";
                    } else if (a.getCheckIn() != null) {
                        return "You checked in at " + a.getCheckIn() + " and checked out at " + a.getCheckOut() + " today.";
                    }
                    return "No check-in recorded for today yet.";
                })
                .orElse("You don't have an attendance record for today yet.");
    }

    private String pendingRegularisationAnswer(Employee employee) {
        long pending = regularisationRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId())
                .stream()
                .filter(r -> r.getStatus() == AttendanceRegularisationRequest.RequestStatus.PENDING)
                .count();
        return pending == 0
                ? "You have no regularisation requests awaiting approval."
                : "You have " + pending + " regularisation request" + (pending == 1 ? "" : "s") + " awaiting approval.";
    }

    private String pendingLoanAnswer(Employee employee) {
        long pending = loanRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId())
                .stream()
                .filter(r -> r.getStatus() == LoanRequest.RequestStatus.PENDING)
                .count();
        return pending == 0
                ? "You have no loan requests awaiting approval."
                : "You have " + pending + " loan request" + (pending == 1 ? "" : "s") + " awaiting approval.";
    }

    private String pendingReimbursementAnswer(Employee employee) {
        long pending = reimbursementRepository
                .findByEmployeeIdAndStatus(employee.getId(), Reimbursement.ReimbursementStatus.REQUESTED)
                .size();
        return pending == 0
                ? "You have no reimbursement requests awaiting approval."
                : "You have " + pending + " reimbursement request" + (pending == 1 ? "" : "s") + " awaiting approval.";
    }

    private String nextHolidayAnswer(Employee employee) {
        if (employee.getCompany() == null) {
            return "No company is set on your profile, so I can't look up your holiday calendar.";
        }
        return holidayRepository
                .findFirstByCompanyIdAndStartDateGreaterThanEqualOrderByStartDateAsc(
                        employee.getCompany().getId(), LocalDate.now())
                .map(h -> "Your next holiday is " + h.getName() + " on " + h.getStartDate() + ".")
                .orElse("There are no upcoming holidays on your company's calendar yet.");
    }
}
