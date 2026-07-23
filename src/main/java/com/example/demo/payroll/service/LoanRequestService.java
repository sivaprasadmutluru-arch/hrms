package com.example.demo.payroll.service;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.service.NotificationService;
import com.example.demo.payroll.dto.LoanRequestDto;
import com.example.demo.payroll.dto.LoanRequestSubmitRequest;
import com.example.demo.payroll.entity.LoanAccount;
import com.example.demo.payroll.entity.LoanRequest;
import com.example.demo.payroll.entity.LoanRequest.RequestStatus;
import com.example.demo.payroll.repository.LoanRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Employee self-service loan/advance/fine requests — the self-service counterpart to
 * {@link com.example.demo.payroll.service.PayrollService}'s LoanAccount CRUD (which
 * HR/Admin use directly). Approving a request here only flags it Approved; HR/Admin
 * still creates the actual LoanAccount manually, referencing the approved request.
 */
@Service
@RequiredArgsConstructor
public class LoanRequestService {

    private final LoanRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRoleRepository userRoleRepository;
    private final NotificationService notificationService;

    private static final List<Role.RoleName> LOAN_APPROVER_ROLES = List.of(
            Role.RoleName.BRANCH_ADMIN, Role.RoleName.ENTERPRISE_ADMIN,
            Role.RoleName.PLATFORM_SUPER_ADMIN, Role.RoleName.HR_MANAGER, Role.RoleName.ACCOUNTANT
    );

    @Transactional
    public LoanRequestDto submitRequest(LoanRequestSubmitRequest req, Long submittingUserId) {
        if (req == null) {
            throw new BadRequestException("Request body is required");
        }
        if (req.getLoanType() == null || req.getLoanType().isBlank()) {
            throw new BadRequestException("Loan type is required");
        }
        LoanAccount.LoanType loanType;
        try {
            loanType = LoanAccount.LoanType.valueOf(req.getLoanType());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid loan type: " + req.getLoanType());
        }
        if (req.getRequestedAmount() == null || req.getRequestedAmount().signum() <= 0) {
            throw new BadRequestException("Requested amount must be greater than zero");
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BadRequestException("Reason is required");
        }

        Employee employee = employeeRepository.findByUserId(submittingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", submittingUserId));

        if (requestRepository.existsByEmployeeIdAndStatus(employee.getId(), RequestStatus.PENDING)) {
            throw new BadRequestException("You already have a loan request pending approval");
        }

        LoanRequest request = new LoanRequest();
        request.setEmployee(employee);
        request.setCompany(employee.getCompany());
        request.setLoanType(loanType);
        request.setRequestedAmount(req.getRequestedAmount());
        request.setRequestedInstallments(req.getRequestedInstallments());
        request.setReason(req.getReason());
        request.setStatus(RequestStatus.PENDING);

        LoanRequest saved = requestRepository.save(request);
        notifyApprovers(saved, employee);
        return LoanRequestDto.from(saved);
    }

    @Transactional
    public LoanRequestDto approve(Long requestId, String remarks, Long approverUserId) {
        LoanRequest request = findRequest(requestId);
        Employee approverEmployee = employeeRepository.findByUserId(approverUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", approverUserId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request is not pending approval");
        }
        requireCompanyAccess(request.getCompany().getId());

        request.setReviewedBy(approverEmployee);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewRemarks(remarks);
        request.setStatus(RequestStatus.APPROVED);

        LoanRequest saved = requestRepository.save(request);
        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.LOAN_REQUEST_APPROVED,
                "Loan Request: Approved",
                "Your loan request has been approved. HR/Admin will set up the loan account shortly.");
        return LoanRequestDto.from(saved);
    }

    @Transactional
    public LoanRequestDto reject(Long requestId, String remarks, Long approverUserId) {
        LoanRequest request = findRequest(requestId);
        Employee approverEmployee = employeeRepository.findByUserId(approverUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", approverUserId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request is not pending approval");
        }
        requireCompanyAccess(request.getCompany().getId());
        if (remarks == null || remarks.isBlank()) {
            throw new BadRequestException("Rejection reason is required");
        }

        request.setReviewedBy(approverEmployee);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewRemarks(remarks);
        request.setStatus(RequestStatus.REJECTED);

        LoanRequest saved = requestRepository.save(request);
        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.LOAN_REQUEST_REJECTED,
                "Loan Request: Rejected",
                "Your loan request was rejected." + (remarks != null ? " Reason: " + remarks : ""));
        return LoanRequestDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<LoanRequestDto> getMyRequests(Long userId) {
        Employee employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", userId));
        return requestRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId())
                .stream().map(LoanRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LoanRequestDto> getPendingApproval(Long companyId) {
        requireCompanyAccess(companyId);
        return requestRepository.findPendingApproval(companyId)
                .stream().map(LoanRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LoanRequestDto> getAllForCompany(Long companyId) {
        requireCompanyAccess(companyId);
        return requestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream().map(LoanRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countPendingApproval(Long companyId) {
        requireCompanyAccess(companyId);
        return requestRepository.countPendingApproval(companyId);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private LoanRequest findRequest(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LoanRequest", id));
    }

    private void requireCompanyAccess(Long companyId) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || companyId == null || !scope.canAccess(companyId)) {
            throw new AccessDeniedException("You do not have access to this company's loan requests");
        }
    }

    private void notifyApprovers(LoanRequest request, Employee employee) {
        Long companyId = request.getCompany().getId();
        Map<Long, UserRole> distinctRecipients = new LinkedHashMap<>();
        for (Role.RoleName roleName : LOAN_APPROVER_ROLES) {
            for (UserRole userRole : userRoleRepository.findByCompanyIdAndRoleName(companyId, roleName)) {
                distinctRecipients.putIfAbsent(userRole.getUser().getId(), userRole);
            }
        }
        String message = fullName(employee) + " submitted a " + request.getLoanType().name().replace("_", " ")
                + " request for " + request.getRequestedAmount();
        for (Long recipientUserId : distinctRecipients.keySet()) {
            notificationService.send(
                    recipientUserId,
                    "New Loan Request",
                    message,
                    Notification.NotificationType.LOAN_REQUEST_SUBMITTED,
                    "LOAN_REQUEST",
                    request.getId(),
                    request.getCompany()
            );
        }
    }

    private void notifyEmployee(Employee employee, LoanRequest request,
                                 Notification.NotificationType type, String title, String message) {
        if (employee.getUser() == null) return;
        notificationService.send(
                employee.getUser().getId(),
                title,
                message,
                type,
                "LOAN_REQUEST",
                request.getId(),
                request.getCompany()
        );
    }

    private static String fullName(Employee e) {
        String first = e.getFirstName() != null ? e.getFirstName() : "";
        String last = e.getLastName() != null ? e.getLastName() : "";
        return (first + " " + last).trim();
    }
}
