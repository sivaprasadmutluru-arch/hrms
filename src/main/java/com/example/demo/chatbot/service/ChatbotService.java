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
    public String answer(String query, Long userId) {
        if (query == null || query.trim().isEmpty()) {
            return "Please provide a question or select a topic to get started.";
        }
        String clean = query.trim();

        // 1. Try matching predefined personal data intents
        Intent intent = null;
        try {
            intent = Intent.valueOf(clean.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            String lower = clean.toLowerCase();
            if (lower.contains("leave balance") || lower.contains("leaves left") || lower.contains("pto")) {
                intent = Intent.LEAVE_BALANCE;
            } else if (lower.contains("payslip") || lower.contains("salary slip") || lower.contains("my salary")) {
                intent = Intent.LATEST_PAYSLIP;
            } else if (lower.contains("checked in") || lower.contains("check in today") || lower.contains("attendance today")) {
                intent = Intent.ATTENDANCE_TODAY;
            } else if (lower.contains("regularisation") || lower.contains("regularization")) {
                intent = Intent.PENDING_REGULARISATION;
            } else if (lower.contains("loan") || lower.contains("salary advance")) {
                intent = Intent.PENDING_LOAN;
            } else if (lower.contains("reimbursement") || lower.contains("expense claim")) {
                intent = Intent.PENDING_REIMBURSEMENT;
            } else if (lower.contains("holiday") || lower.contains("next holiday")) {
                intent = Intent.NEXT_HOLIDAY;
            }
        }

        if (intent != null) {
            Employee employee = employeeRepository.findByUserId(userId).orElse(null);
            if (employee == null) {
                return adminSelfServiceFallback(intent);
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

        // 2. Answer application knowledge queries
        return answerFeatureQuery(clean);
    }

    private String adminSelfServiceFallback(Intent intent) {
        return switch (intent) {
            case LEAVE_BALANCE -> "You are logged in with an administrative account without a linked personal employee record. As an administrator, you can view and manage all employee leave allocations and approvals under Leave Management (/leaves).";
            case LATEST_PAYSLIP -> "You are logged in with an administrative account. To view, calculate, or download employee payslips, open Payroll Management (/payroll).";
            case ATTENDANCE_TODAY -> "You are logged in with an administrative account without daily punch tracking. To check employee attendance logs, check-ins, or regularisations, open Attendance (/attendance).";
            case PENDING_REGULARISATION -> "You are logged in with an administrative account. You can review and approve all employee regularisation requests in Attendance > Regularisation (/attendance/regularisation).";
            case PENDING_LOAN -> "You are logged in with an administrative account. You can review and approve employee loan applications under Payroll > Loans (/payroll/loans).";
            case PENDING_REIMBURSEMENT -> "You are logged in with an administrative account. You can review and approve employee expense reimbursements under Payroll > Reimbursements (/payroll/reimbursements).";
            case NEXT_HOLIDAY -> "To manage or inspect your organization's holiday calendar, visit Leaves > Holidays (/leaves/holidays).";
        };
    }

    private String answerFeatureQuery(String query) {
        String lower = query.toLowerCase();

        if (lower.contains("payroll") || lower.contains("salary") || lower.contains("net pay")) {
            return "How to Run Payroll:\n" +
                    "1. Navigate to Payroll > Automated Payroll (/payroll/automated).\n" +
                    "2. Select the target Year, Month, and Branch or Batch Group.\n" +
                    "3. Click 'Calculate Payroll' to compute gross pay, attendance days, and statutory deductions (PF, ESI, PT, TDS).\n" +
                    "4. Review salary summaries and click 'Finalize & Issue Payslips'.\n" +
                    "5. Employees can immediately view and download PDF payslips under Payroll > Payslips (/payroll/payslips).";
        }

        if (lower.contains("add employee") || lower.contains("create employee") || lower.contains("import employee") || lower.contains("staff")) {
            return "How to Add or Import Employees:\n" +
                    "1. Go to Employees > Employee Directory (/employees).\n" +
                    "2. To add an individual employee, click '+ Add Employee' and enter basic details, work branch, department, and salary structure.\n" +
                    "3. To bulk import, click 'Import', download the spreadsheet template, fill in employee rows, and upload.\n" +
                    "4. The new employee will automatically receive an onboarding credentials email.";
        }

        if (lower.contains("attendance") || lower.contains("check in") || lower.contains("check-in") || lower.contains("grace") || lower.contains("shift")) {
            return "Attendance & Shift Management:\n" +
                    "1. Check-in / Check-out: Employees can punch in/out on the Dashboard or via connected Biometric devices.\n" +
                    "2. Grace Period: AccrueHRMS defaults to a 1-hour grace period for check-ins, configurable under Attendance Settings (/attendance/settings).\n" +
                    "3. Shifts: Configure core work hours under Shift Schedules (/attendance/schedules) and assign rotations under Shift Allocations (/attendance/shift-allocations).\n" +
                    "4. Regularisation: Missed punch corrections can be requested and approved under Attendance > Regularisation (/attendance/regularisation).";
        }

        if (lower.contains("leave") || lower.contains("pto") || lower.contains("vacation")) {
            return "Leave Management & Approvals:\n" +
                    "1. Request Leave: Employees click 'Request Leave' under Leaves (/leaves), select leave type (Casual, Sick, Paid), and date range.\n" +
                    "2. Approvals: Reporting managers and HR review pending applications under Leaves > Approvals with instant approval or rejection feedback.\n" +
                    "3. Quotas & Types: Set up annual leave allocations and policies under Leaves > Leave Types (/leaves/types).";
        }

        if (lower.contains("biometric") || lower.contains("zkteco") || lower.contains("essl") || lower.contains("fingerprint")) {
            return "Biometric Device Integration:\n" +
                    "1. Go to Biometric > Devices (/biometric/devices) and click '+ Register Device'.\n" +
                    "2. Enter the device IP, Port (e.g. 4370), Protocol, and Branch Location.\n" +
                    "3. Under Biometric > Employees (/biometric/employees), map the device user ID (e.g. 101) to the employee profile.\n" +
                    "4. Punches on the physical machine will stream automatically into AccrueHRMS.";
        }

        if (lower.contains("letter") || lower.contains("offer letter") || lower.contains("appointment letter") || lower.contains("experience")) {
            return "Official HR Letters & Certificates:\n" +
                    "1. Navigate to Documents > Letters (/documents/letters) and click '+ Create Letter'.\n" +
                    "2. Select template: Offer Letter, Appointment Letter, Promotion Letter, Relieving Letter, or Experience Certificate.\n" +
                    "3. Select the candidate or employee; dynamic placeholders automatically populate.\n" +
                    "4. Click 'Preview PDF' to inspect and 'Send Email' to dispatch directly to the recipient.";
        }

        if (lower.contains("recruitment") || lower.contains("job opening") || lower.contains("career") || lower.contains("interview")) {
            return "Recruitment & Candidate Pipeline:\n" +
                    "1. Job Openings: Post vacancies with descriptions under Recruitment > Posts (/recruitment/posts).\n" +
                    "2. Pipeline: Track applicants visually across Applied, Screening, Interview, Offered, and Hired in the Kanban board (/recruitment/pipeline).\n" +
                    "3. Public Careers: Candidates apply online through your branded career portal at /careers/:slug.\n" +
                    "4. Interviews: Schedule interview rounds and record evaluation scores under Recruitment > Interviews (/recruitment/interviews).";
        }

        if (lower.contains("subscription") || lower.contains("plan") || lower.contains("pricing") || lower.contains("gst") || lower.contains("razorpay")) {
            return "Subscription Plans & Billing:\n" +
                    "1. Visit Subscription (/subscription) to choose between Free (up to 15 employees, Free Forever), Basic (₹999/mo), Standard (₹2,999/mo), and Enterprise (₹6,999/mo).\n" +
                    "2. Annual billing plans include a 2-month discount.\n" +
                    "3. Checkout is securely powered by Razorpay. An 18% GST is automatically calculated and included in the debited amount, with instant invoice generation.";
        }

        if (lower.contains("role") || lower.contains("permission") || lower.contains("access")) {
            return "Roles & Permissions:\n" +
                    "1. Manage user access permissions under Roles & Access (/roles).\n" +
                    "2. Roles include Super Admin, Enterprise Admin, Branch Admin, HR Manager, Accountant, and Employee.\n" +
                    "3. Create custom permission bundles under User Groups (/roles/user-groups).";
        }

        return "AccrueHRMS Assistant Help:\n" +
                "I can guide you through any feature in the application:\n" +
                "- Payroll & Payslips: Automated salary processing and PDF payslips (/payroll)\n" +
                "- Employee Directory: Adding, importing, and managing team profiles (/employees)\n" +
                "- Attendance & Shifts: Web check-in, biometric devices, grace time (/attendance)\n" +
                "- Leave Management: Applying for leaves, quotas, and approvals (/leaves)\n" +
                "- Recruitment & Careers: Job postings, candidate pipeline, and interviews (/recruitment)\n" +
                "- HR Letters: Generating offer, appointment, and relieving letters (/documents/letters)\n" +
                "- Subscriptions & GST: Razorpay billing and plan management (/subscription)\n" +
                "Ask a specific 'how to' question or type what you're looking for!";
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
