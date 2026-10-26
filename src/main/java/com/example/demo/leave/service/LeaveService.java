package com.example.demo.leave.service;

import com.example.demo.base.entity.EmployeeType;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.EmployeeTypeRepository;
import com.example.demo.common.event.LeaveApprovedEvent;
import com.example.demo.common.event.LeaveRejectedEvent;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveService {

    private final ApplicationEventPublisher eventPublisher;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;
    private final AvailableLeaveRepository availableLeaveRepository;
    private final HolidayRepository holidayRepository;
    private final HolidayAllocationRepository holidayAllocationRepository;
    private final CompanyLeaveRepository companyLeaveRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeTypeRepository employeeTypeRepository;
    private final LeaveRequestConditionApprovalRepository conditionApprovalRepository;
    private final LeaveRequestCommentRepository requestCommentRepository;
    private final LeaveRequestFileRepository requestFileRepository;
    private final FileUploadService fileUploadService;
    private final com.example.demo.employee.service.ReportingManagerService reportingManagers;
    private final com.example.demo.notification.service.NotificationService notifications;

    @PersistenceContext
    private EntityManager entityManager;

    private boolean isReportingManager(Employee employee, Long userId) {
        if (employee == null || userId == null) return false;
        Employee manager = reportingManagers.resolve(employee);
        if (manager == null || !manager.isActive() || manager.getUser() == null || !manager.getUser().getId().equals(userId)) {
            return false;
        }
        if (employee.getUser() != null && employee.getUser().getId().equals(userId)) {
            return false;
        }
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null) {
            return scope.canAccess(employee.getCompany().getId());
        }
        return manager.getCompany().getId().equals(employee.getCompany().getId());
    }

    private Specification<LeaveRequest> directReports() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || scope.getUserId() == null) return (r,q,c) -> c.disjunction();
        List<Long> ids = scope.getAccessibleCompanyIds().stream()
                .filter(id -> scope.getFilterCompanyId() == null || id.equals(scope.getFilterCompanyId()))
                .flatMap(id -> employeeRepository.findByCompanyId(id).stream())
                .filter(e -> isReportingManager(e, scope.getUserId())).map(Employee::getId).toList();
        return (r,q,c) -> ids.isEmpty() ? c.disjunction() : r.get("employee").get("id").in(ids);
    }

    @Transactional(readOnly = true)
    public boolean reviewAllowed(Long requestId) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return false;
        LeaveRequest request = leaveRequestRepository.findById(requestId).orElse(null);
        if (request == null || !scope.canAccess(request.getCompany().getId())
                || (scope.getFilterCompanyId() != null && !scope.getFilterCompanyId().equals(request.getCompany().getId()))) return false;
        if (request.getEmployee().getUser() != null && request.getEmployee().getUser().getId().equals(scope.getUserId())) return false;
        if (isReportingManager(request.getEmployee(), scope.getUserId())) return true;
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || scope.isSelfScope()) return false;
        boolean hasApproveAuthority = auth.getAuthorities().stream().anyMatch(a -> {
            String authority = a.getAuthority();
            return authority.equals("leave:approve")
                    || authority.equals("ROLE_DEPARTMENT_MANAGER")
                    || authority.equals("ROLE_COMPANY_MANAGER")
                    || authority.equals("ROLE_BRANCH_ADMIN")
                    || authority.equals("ROLE_HR_MANAGER")
                    || authority.equals("ROLE_ENTERPRISE_ADMIN")
                    || authority.equals("ROLE_COMPANY_ADMIN")
                    || authority.equals("ROLE_SUPER_ADMIN")
                    || authority.equals("ROLE_PLATFORM_SUPER_ADMIN");
        });
        if (!hasApproveAuthority) return false;
        Specification<LeaveRequest> visible = ScopeFilter.byEmployeeDepartment();
        return visible != null && leaveRequestRepository.exists(visible.and((r,q,c) -> c.equal(r.get("id"),requestId)));
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllRequests(Pageable pageable) {
        return getAllRequests(pageable, null, null, false);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllRequests(Pageable pageable, Integer year) {
        return getAllRequests(pageable, year, null, false);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllRequests(Pageable pageable, Integer year,
                                               LeaveRequest.LeaveStatus status,
                                               boolean includeCancelled) {
        // NOTE: byEmployeeDepartment() honors the X-Filter-Company-Id header (topbar branch
        // switcher) centrally via ScopeFilter.applyBranchFilter.
        Specification<LeaveRequest> spec = ScopeFilter.byEmployeeDepartment();
        if (spec != null) spec = spec.or(directReports());
        if (year != null) {
            Specification<LeaveRequest> yearRange = yearSpecification(year);
            spec = spec == null ? yearRange : spec.and(yearRange);
        }
        if (status != null) {
            Specification<LeaveRequest> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), status);
            spec = spec == null ? statusSpec : spec.and(statusSpec);
        }
        if (!includeCancelled) {
            Specification<LeaveRequest> activeRequests = (root, query, cb) -> cb.or(
                    cb.isNull(root.get("status")),
                    cb.notEqual(root.get("status"), LeaveRequest.LeaveStatus.CANCELLED));
            spec = spec == null ? activeRequests : spec.and(activeRequests);
        }
        Specification<LeaveRequest> pendingFirst = (root, query, cb) -> {
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                var priority = cb.<Integer>selectCase().when(cb.equal(root.get("status"), LeaveRequest.LeaveStatus.REQUESTED), 0).otherwise(1);
                query.orderBy(cb.asc(priority), cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
            }
            return cb.conjunction();
        };
        spec = spec == null ? pendingFirst : spec.and(pendingFirst);
        pageable = org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return leaveRequestRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public List<LeaveType> getLeaveTypes() {
        Specification<LeaveType> spec = ScopeFilter.byCompany();
        if (spec != null) {
            Specification<LeaveType> orgWide = (root, query, cb) -> cb.isTrue(root.get("isOrganizationWide"));
            return orderLeaveTypes(leaveTypeRepository.findAll(Specification.where(spec).or(orgWide)));
        }
        return orderLeaveTypes(leaveTypeRepository.findAll());
    }

    /** Keep employee leave choices in a predictable, policy-friendly order. */
    private List<LeaveType> orderLeaveTypes(List<LeaveType> leaveTypes) {
        return leaveTypes.stream()
                .sorted(Comparator.comparingInt(this::leaveTypeOrder)
                        .thenComparing(t -> t.getName() == null ? "" : t.getName(), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private int leaveTypeOrder(LeaveType leaveType) {
        String name = leaveType == null || leaveType.getName() == null
                ? "" : leaveType.getName().trim().toLowerCase(java.util.Locale.ROOT);
        if (name.contains("annual")) return 0;
        if (name.contains("sick")) return 1;
        if (name.contains("compassionate")) return 2;
        if (name.contains("paternity")) return 3;
        if (name.contains("maternity")) return 4;
        return 10;
    }

    @Transactional(readOnly = true)
    public List<LeaveAllocation> getAllocations(Long employeeId, Integer year) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && scope.isSelfScope()) {
            return employeeRepository.findByUserId(scope.getUserId())
                    .map(e -> leaveAllocationRepository.findByEmployeeId(e.getId()))
                    .orElse(java.util.Collections.emptyList());
        }
        if (employeeId != null) return leaveAllocationRepository.findByEmployeeId(employeeId);
        Long companyId = scope != null ? scope.getCompanyId() : null;
        if (companyId != null && year != null) return leaveAllocationRepository.findByCompanyIdAndYear(companyId, year);
        if (companyId != null) return leaveAllocationRepository.findByCompanyId(companyId);
        return leaveAllocationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public LeaveRequest getRequestById(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));
    }

    // ─── Apply Leave ──────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest applyLeave(Long employeeId, Long leaveTypeId, LocalDate startDate,
                                    LocalDate endDate, String description, Long companyId) {
        return applyLeave(employeeId, leaveTypeId, startDate, endDate, description, companyId,
                LeaveRequest.LeaveDuration.FULL_DAY, null);
    }

    @Transactional
    public LeaveRequest applyLeave(Long employeeId, Long leaveTypeId, LocalDate startDate,
                                    LocalDate endDate, String description, Long companyId,
                                    LeaveRequest.LeaveDuration leaveDuration) {
        return applyLeave(employeeId, leaveTypeId, startDate, endDate, description, companyId,
                leaveDuration, null);
    }

    @Transactional
    public LeaveRequest applyLeave(Long employeeId, Long leaveTypeId, LocalDate startDate,
                                    LocalDate endDate, String description, Long companyId,
                                    LeaveRequest.LeaveDuration leaveDuration, String attachmentPath) {
        validateApplicationDates(startDate, endDate, LocalDate.now());
        LeaveRequest.LeaveDuration duration = leaveDuration == null
                ? LeaveRequest.LeaveDuration.FULL_DAY : leaveDuration;
        LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveTypeId));
        double workingDays = calculateWorkingDays(startDate, endDate, companyId, leaveType, employeeId);
        double days = resolveRequestedDays(workingDays, duration, startDate, endDate);
        if (requiresCertificate(leaveType, days) && !hasStoredCertificate(attachmentPath)) {
            throw new BadRequestException("A supporting certificate is required for sick leave longer than one day or when required by the leave type.");
        }

        // Reject if employee already has an active (pending or approved) request overlapping these dates
        List<LeaveRequest> overlapping = leaveRequestRepository.findActiveOverlapping(employeeId, startDate, endDate);
        if (!overlapping.isEmpty()) {
            LeaveRequest clash = overlapping.get(0);
            throw new BadRequestException(
                    "You already have a " + clash.getStatus().name().toLowerCase() +
                    " leave request from " + clash.getStartDate() + " to " + clash.getEndDate() +
                    " that overlaps with the requested dates.");
        }

        // Validate balance: remaining is DERIVED (available + carryforward − used), not stored.
        // Available Days is the constant allocation; we never read it as "what's left" anymore.
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        double remaining = computeRemaining(balance, employeeId, leaveTypeId, startDate);
        double forecasted = balance.forcastedLeaves(startDate);
        double totalBalance = remaining + forecasted;
        if (days > totalBalance) {
            // Check negative balance allowance
            boolean negAllowed = Boolean.TRUE.equals(leaveType.getNegativeBalanceAllowed());
            if (negAllowed) {
                double limit = leaveType.getNegativeBalanceLimit() != null ? leaveType.getNegativeBalanceLimit() : Double.MAX_VALUE;
                double wouldBeBalance = totalBalance - days;
                if (wouldBeBalance < -limit) {
                    throw new BadRequestException(
                        "Exceeds negative balance limit. Limit: -" + limit + ", Would be: " + wouldBeBalance);
                }
            } else {
                throw new BadRequestException(
                    "Insufficient leave balance. Available: " + totalBalance + ", Requested: " + days);
            }
        }

        LeaveRequest request = new LeaveRequest();
        request.setEmployee(employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId)));
        request.setLeaveType(leaveType);
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setRequestedDays(days);
        request.setLeaveDuration(duration);
        request.setDescription(description);
        request.setAttachmentPath(attachmentPath == null || attachmentPath.isBlank() ? null : attachmentPath.trim());
        request.setStatus(LeaveRequest.LeaveStatus.REQUESTED);
        request.setCompany(companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));

        if (leaveType.getLeaveValidationType() == LeaveType.LeaveValidationType.AUTOMATIC) {
            deductBalance(balance, days, request);
            request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        }

        LeaveRequest saved = leaveRequestRepository.save(request);
        Employee manager = reportingManagers.resolve(saved.getEmployee());
        if (saved.getStatus() == LeaveRequest.LeaveStatus.REQUESTED && manager != null
                && isReportingManager(saved.getEmployee(), manager.getUser() == null ? null : manager.getUser().getId())) {
            notifications.send(manager.getUser().getId(), "Leave request awaiting review",
                    saved.getEmployee().getFirstName() + " requested leave from " + startDate + " to " + endDate,
                    com.example.demo.notification.entity.Notification.NotificationType.LEAVE_REQUEST,
                    "leave", saved.getId(), saved.getCompany());
        }
        return saved;
    }

    static boolean requiresCertificate(LeaveType leaveType, double requestedDays) {
        String normalizedName = leaveType.getName() == null ? ""
                : leaveType.getName().replaceAll("[^a-zA-Z]", "").toLowerCase(java.util.Locale.ROOT);
        // Single-day sick leave is exempt, including when the type requires attachments.
        // Other leave types retain their individually configured attachment requirement.
        if ("sickleave".equals(normalizedName)) return requestedDays > 1d;
        return Boolean.TRUE.equals(leaveType.getRequireAttachment());
    }

    private boolean hasStoredCertificate(String attachmentPath) {
        if (attachmentPath == null || attachmentPath.isBlank()
                || !attachmentPath.replace('\\', '/').startsWith("leave-certificates/")) {
            return false;
        }
        try {
            return java.nio.file.Files.isRegularFile(fileUploadService.resolve(attachmentPath));
        } catch (RuntimeException ex) {
            return false;
        }
    }

    // ─── Approve / Reject / Cancel ────────────────────────────────────────────

    static void validateApplicationDates(LocalDate startDate, LocalDate endDate, LocalDate today) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            throw new BadRequestException("End date must be on or after start date");
        }
        LocalDate earliestDate = today.minusMonths(2);
        if (startDate.isBefore(earliestDate)) {
            throw new BadRequestException("Leave can only be applied up to 2 months in the past. "
                    + "Start date must be on or after " + earliestDate);
        }
    }

    @Transactional
    public LeaveRequest approve(Long requestId, Long approverUserId) {
        if (!reviewAllowed(requestId)) throw new org.springframework.security.access.AccessDeniedException("You cannot review this employee's leave request");
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));
        if (request.getStatus() != LeaveRequest.LeaveStatus.REQUESTED) {
            throw new BadRequestException("Leave request is not in REQUESTED state");
        }

        // Enforce that all condition approvals are completed before approving
        List<LeaveRequestConditionApproval> conditionApprovals =
                conditionApprovalRepository.findByLeaveRequestIdOrderBySequenceAsc(requestId);
        boolean hasPending = conditionApprovals.stream()
                .anyMatch(a -> !Boolean.TRUE.equals(a.getIsApproved()) && !Boolean.TRUE.equals(a.getIsRejected()));
        if (hasPending) {
            throw new BadRequestException("All condition approval steps must be completed before approving this request");
        }

        AvailableLeave balance = getOrCreateAvailableLeave(
                request.getEmployee().getId(), request.getLeaveType().getId());

        // Balance check: remaining is DERIVED (available + carryforward − used), not stored.
        double remaining = computeRemaining(balance, request.getEmployee().getId(), request.getLeaveType().getId(), request.getStartDate());
        double forecasted = balance.forcastedLeaves(request.getStartDate());
        double totalBalance = remaining + forecasted;
        LeaveType leaveType = request.getLeaveType();
        boolean isUnpaid = leaveType != null && leaveType.getPaymentType() == LeaveType.PaymentType.UNPAID;
        boolean allowNegative = leaveType != null && Boolean.TRUE.equals(leaveType.getNegativeBalanceAllowed());
        double maxAllowed = totalBalance + (allowNegative ? (leaveType.getNegativeBalanceLimit() != null ? leaveType.getNegativeBalanceLimit() : 999999.0) : 0.0);
        if (!isUnpaid && request.getRequestedDays() > maxAllowed) {
            throw new BadRequestException(
                    "Insufficient leave balance. Available: " + totalBalance
                            + ", Requested: " + request.getRequestedDays());
        }

        deductBalance(balance, request.getRequestedDays(), request);
        request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        if (approverUserId != null) {
            employeeRepository.findByUserId(approverUserId)
                    .ifPresent(request::setApprovedBy);
        }
        LeaveRequest saved = leaveRequestRepository.save(request);
        eventPublisher.publishEvent(new LeaveApprovedEvent(this, saved));
        return saved;
    }

    @Transactional
    public LeaveRequest reject(Long requestId, String reason) {
        if (!reviewAllowed(requestId)) throw new org.springframework.security.access.AccessDeniedException("You cannot review this employee's leave request");
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));

        // If the request was already APPROVED, restore the balance
        if (request.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
            restoreBalance(request.getEmployee().getId(),
                    request.getLeaveType().getId(), request);
        }

        request.setStatus(LeaveRequest.LeaveStatus.REJECTED);
        request.setRejectReason(reason);
        LeaveRequest saved = leaveRequestRepository.save(request);
        eventPublisher.publishEvent(new LeaveRejectedEvent(this, saved, reason));
        return saved;
    }

    @Transactional
    public LeaveRequest cancel(Long requestId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));

        if (request.getStatus() == LeaveRequest.LeaveStatus.CANCELLED) {
            throw new BadRequestException("Leave request is already cancelled");
        }

        // Restore balance only if leave was approved (deduction already happened)
        if (request.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
            restoreBalance(request.getEmployee().getId(),
                    request.getLeaveType().getId(), request);
        }

        request.setStatus(LeaveRequest.LeaveStatus.CANCELLED);
        LeaveRequest saved = leaveRequestRepository.save(request);
        if (saved.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
            eventPublisher.publishEvent(new LeaveApprovedEvent(this, saved));
        }
        return saved;
    }

    static double resolveRequestedDays(double workingDays, LeaveRequest.LeaveDuration duration,
                                       LocalDate startDate, LocalDate endDate) {
        if (duration != LeaveRequest.LeaveDuration.FULL_DAY) {
            if (!startDate.equals(endDate)) {
                throw new BadRequestException("Half-day leave must start and end on the same date");
            }
            if (workingDays != 1.0) {
                throw new BadRequestException("Half-day leave must be requested on a working day");
            }
            return 0.5;
        }
        if (workingDays <= 0) {
            throw new BadRequestException("The selected period contains no eligible working days");
        }
        return workingDays;
    }

    private static final List<String> LEAVE_PURGE_TABLES = List.of(
            "leave_request_files",
            "leave_request_comments",
            "leave_request_condition_approvals",
            "leave_requests",
            "leave_allocation_request_comments",
            "leave_allocation_requests",
            "compensatory_leave_request_comments",
            "compensatory_leave_attendances",
            "compensatory_leave_requests",
            "leave_allocations",
            "available_leaves",
            "leave_accrual_logs",
            "employee_past_leave_restricts"
    );

    /**
     * Returns the operational leave data that an authorised administrator can purge.
     * Leave policies (types, restrictions, holiday and company-leave configuration) are
     * intentionally not included.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getPurgeSummary(Long companyId) {
        validatePurgeScope(companyId);
        return collectPurgeCounts();
    }

    /**
     * Clears operational leave history and balances for the selected company. The
     * confirmation phrase is a second server-side guard for this irreversible action.
     */
    @Transactional
    public Map<String, Long> purgeOperationalLeaveData(Long companyId, String confirmation) {
        validatePurgeScope(companyId);
        if (!"DELETE ALL LEAVE DATA".equals(confirmation)) {
            throw new BadRequestException("Type DELETE ALL LEAVE DATA to confirm this action.");
        }

        List<String> storedFiles = requestFileRepository.findAll().stream()
                .map(LeaveRequestFile::getFilePath)
                .filter(path -> path != null && !path.isBlank())
                .toList();
        Map<String, Long> deleted = collectPurgeCounts();
        for (String table : LEAVE_PURGE_TABLES) {
            if (tableExists(table)) {
                entityManager.createNativeQuery("DELETE FROM " + table).executeUpdate();
            }
        }
        entityManager.flush();
        storedFiles.forEach(fileUploadService::delete);
        return deleted;
    }

    private void validatePurgeScope(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("Select a company before deleting leave data.");
        }
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || !scope.canAccess(companyId)
                || !companyId.equals(scope.getCompanyId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Select a company you are authorised to manage before deleting leave data.");
        }
        if (TenantContext.DEFAULT_TENANT.equals(TenantContext.getTenant())) {
            throw new BadRequestException("Leave data deletion is not available in all-companies mode.");
        }
    }

    private Map<String, Long> collectPurgeCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : LEAVE_PURGE_TABLES) {
            if (tableExists(table)) {
                Number count = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM " + table)
                        .getSingleResult();
                counts.put(table, count.longValue());
            }
        }
        return counts;
    }

    private boolean tableExists(String table) {
        return Boolean.TRUE.equals(entityManager.createNativeQuery(
                        "SELECT EXISTS (SELECT 1 FROM information_schema.tables " +
                                "WHERE table_schema = current_schema() AND table_name = :table)")
                .setParameter("table", table)
                .getSingleResult());
    }

    /** Permanently deletes leave requests visible to the current administrative scope. */
    @Transactional
    public int deleteRequests(List<Long> requestIds) {
        if (requestIds == null || requestIds.isEmpty()) {
            throw new BadRequestException("Select at least one leave request");
        }
        List<Long> ids = requestIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty() || ids.size() > 10000) {
            throw new BadRequestException("Select between 1 and 10,000 leave requests");
        }

        List<LeaveRequest> requests = leaveRequestRepository.findAllById(ids);
        if (requests.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more leave requests were not found");
        }
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        for (LeaveRequest request : requests) {
            Long companyId = request.getCompany().getId();
            if (scope == null || !scope.canAccess(companyId)
                    || (scope.getFilterCompanyId() != null && !scope.getFilterCompanyId().equals(companyId))) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You cannot delete leave requests outside the selected company");
            }
        }

        for (LeaveRequest request : requests) {
            conditionApprovalRepository.deleteAll(
                    conditionApprovalRepository.findByLeaveRequestIdOrderBySequenceAsc(request.getId()));
            requestCommentRepository.deleteAll(requestCommentRepository.findByLeaveRequestId(request.getId()));
            List<LeaveRequestFile> files = requestFileRepository.findByLeaveRequestId(request.getId());
            requestFileRepository.deleteAll(files);
            for (LeaveRequestFile file : files) {
                if (file.getFilePath() == null || file.getFilePath().isBlank()) continue;
                try {
                    java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(file.getFilePath()));
                } catch (java.io.IOException ex) {
                    log.warn("Leave request {} deleted, but attachment cleanup failed: {}",
                            request.getId(), ex.getMessage());
                }
            }
        }
        leaveRequestRepository.deleteAll(requests);
        log.info("Permanently deleted {} leave request(s): {}", requests.size(), ids);
        return requests.size();
    }

    @Transactional
    public int deleteAllocations(List<Long> allocationIds) {
        if (allocationIds == null || allocationIds.isEmpty()) {
            throw new BadRequestException("Select at least one leave allocation");
        }
        List<Long> ids = allocationIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty() || ids.size() > 10000) {
            throw new BadRequestException("Select between 1 and 10,000 leave allocations");
        }
        List<LeaveAllocation> allocations = leaveAllocationRepository.findAllById(ids);
        if (allocations.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more leave allocations were not found");
        }
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        for (LeaveAllocation allocation : allocations) {
            Long companyId = allocation.getCompany().getId();
            if (scope == null || !scope.canAccess(companyId)
                    || (scope.getFilterCompanyId() != null && !scope.getFilterCompanyId().equals(companyId))) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You cannot delete leave allocations outside the selected company");
            }
        }
        leaveAllocationRepository.deleteAll(allocations);
        log.info("Permanently deleted {} leave allocation(s): {}", allocations.size(), ids);
        return allocations.size();
    }

    private Specification<LeaveRequest> yearSpecification(int year) {
        if (year < 1900 || year > 2200) throw new BadRequestException("Enter a valid four-digit year");
        return (root, query, cb) -> cb.between(
                root.get("startDate"), LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    // ─── Leave Types ──────────────────────────────────────────────────────────

    @Transactional
    public LeaveType createLeaveType(LeaveType leaveType) {
        if (isSickLeaveType(leaveType.getName())) leaveType.setRequireAttachment(true);
        normalizeAccrualPolicy(leaveType);
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (Boolean.TRUE.equals(leaveType.getIsOrganizationWide())) {
            if (scope != null && !scope.hasUnrestrictedAccess()
                    && scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.BRANCH) {
                throw new BadRequestException(
                        "Only Head Office admins can create organization-wide leave policies.");
            }
        }
        if (leaveType.getCompany() == null) {
            Long companyId = scope != null ? scope.getCompanyId() : null;
            if (companyId == null) throw new BadRequestException("Unable to determine company from session.");
            leaveType.setCompany(companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
        }
        resolveApplicableEmployeeTypes(leaveType);
        return leaveTypeRepository.save(leaveType);
    }

    @Transactional
    public LeaveType updateLeaveType(Long id, LeaveType updated) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", id));
        lt.setName(updated.getName());
        lt.setTotalDays(updated.getTotalDays());
        lt.setPaymentType(updated.getPaymentType());
        lt.setCarryforwardType(updated.getCarryforwardType());
        lt.setCarryforwardMax(updated.getCarryforwardMax());
        lt.setLeaveValidationType(updated.getLeaveValidationType());
        lt.setColorCode(updated.getColorCode());
        lt.setReset(updated.getReset());
        lt.setResetBased(updated.getResetBased());
        lt.setResetMonth(updated.getResetMonth());
        lt.setResetDay(updated.getResetDay());
        lt.setResetWeekend(updated.getResetWeekend());
        lt.setCarryforwardExpireIn(updated.getCarryforwardExpireIn());
        lt.setCarryforwardExpirePeriod(updated.getCarryforwardExpirePeriod());
        lt.setCarryforwardExpireDate(updated.getCarryforwardExpireDate());
        lt.setExcludeHoliday(updated.getExcludeHoliday());
        lt.setExcludeCompanyLeave(updated.getExcludeCompanyLeave());
        lt.setExcludeWeekend(updated.getExcludeWeekend());
        lt.setRequireAttachment(isSickLeaveType(updated.getName()) || Boolean.TRUE.equals(updated.getRequireAttachment()));
        lt.setLimitLeave(updated.getLimitLeave());
        lt.setIsEncashable(updated.getIsEncashable());
        lt.setAccrualEnabled(updated.getAccrualEnabled());
        lt.setMidYearJoinerMode(updated.getMidYearJoinerMode());
        lt.setAccrualPostingTiming(updated.getAccrualPostingTiming());
        lt.setAccrualCalculationMethod(updated.getAccrualCalculationMethod());
        lt.setAccrualPrecision(updated.getAccrualPrecision());
        lt.setAccrualProrationBasis(updated.getAccrualProrationBasis());
        lt.setAccrualStartDate(updated.getAccrualStartDate());
        normalizeAccrualPolicy(lt);
        lt.setNegativeBalanceAllowed(updated.getNegativeBalanceAllowed());
        lt.setNegativeBalanceLimit(updated.getNegativeBalanceLimit());
        lt.setActive(updated.isActive());
        if (updated.getApplicableEmployeeTypes() != null) {
            List<Long> ids = updated.getApplicableEmployeeTypes().stream()
                    .filter(et -> et.getId() != null).map(EmployeeType::getId).toList();
            lt.setApplicableEmployeeTypes(ids.isEmpty() ? new java.util.ArrayList<>()
                    : employeeTypeRepository.findAllById(ids));
        }
        return leaveTypeRepository.save(lt);
    }

    private boolean isSickLeaveType(String name) {
        return name != null && "sickleave".equals(name.replaceAll("[^a-zA-Z]", "")
                .toLowerCase(java.util.Locale.ROOT));
    }

    private void normalizeAccrualPolicy(LeaveType leaveType) {
        if (leaveType.getAccrualPostingTiming() == null) leaveType.setAccrualPostingTiming(LeaveType.AccrualPostingTiming.END_OF_MONTH);
        if (leaveType.getAccrualCalculationMethod() == null) leaveType.setAccrualCalculationMethod(LeaveType.AccrualCalculationMethod.FIXED_MONTHLY);
        if (leaveType.getAccrualPrecision() == null || leaveType.getAccrualPrecision() < 1 || leaveType.getAccrualPrecision() > 2) leaveType.setAccrualPrecision(1);
        if (leaveType.getAccrualProrationBasis() == null) leaveType.setAccrualProrationBasis(LeaveType.AccrualProrationBasis.CALENDAR_DAYS);
    }

    private void resolveApplicableEmployeeTypes(LeaveType leaveType) {
        if (leaveType.getApplicableEmployeeTypes() != null && !leaveType.getApplicableEmployeeTypes().isEmpty()) {
            List<Long> ids = leaveType.getApplicableEmployeeTypes().stream()
                    .filter(et -> et.getId() != null).map(EmployeeType::getId).toList();
            leaveType.setApplicableEmployeeTypes(ids.isEmpty() ? new java.util.ArrayList<>()
                    : employeeTypeRepository.findAllById(ids));
        }
    }

    @Transactional
    public void deleteLeaveType(Long id) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", id));
        leaveTypeRepository.delete(lt);
    }

    // ─── Allocation ───────────────────────────────────────────────────────────

    @Transactional
    public void allocateLeave(Long employeeId, Long leaveTypeId, double days, int year, Long companyId) {
        LeaveAllocation allocation = leaveAllocationRepository
                .findByEmployeeIdAndLeaveTypeIdAndYear(employeeId, leaveTypeId, year)
                .orElseGet(() -> {
                    LeaveAllocation a = new LeaveAllocation();
                    a.setEmployee(employeeRepository.findById(employeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId)));
                    a.setLeaveType(leaveTypeRepository.findById(leaveTypeId)
                            .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveTypeId)));
                    a.setYear(year);
                    a.setCompany(companyRepository.findById(companyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
                    return a;
                });
        allocation.setTotalLeaveDays(days);
        allocation.setAvailableDays(days);
        leaveAllocationRepository.save(allocation);

        // Sync AvailableLeave — preserve existing carryforward, only reset for new records
        boolean isNewBalance = availableLeaveRepository
                .findByEmployeeIdAndLeaveTypeId(employeeId, leaveTypeId).isEmpty();
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        balance.setAvailableDays(days);
        if (isNewBalance) {
            balance.setCarryforwardDays(0.0);
        }
        balance.setAssignedDate(LocalDate.now());
        // Set reset_date if this leave type has reset configured (mirrors Horilla pre_save_processing)
        if (Boolean.TRUE.equals(balance.getLeaveType().getReset()) && balance.getResetDate() == null) {
            balance.setResetDate(balance.computeNextResetDate(LocalDate.now()));
        }
        // Set expired_date for CARRYFORWARD_EXPIRE types using the LeaveType's carryforward_expire_date
        if (balance.getLeaveType().getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE) {
            balance.setExpiredDate(balance.getLeaveType().getCarryforwardExpireDate());
        }
        availableLeaveRepository.save(balance);
    }

    /**
     * Bulk allocate a leave type to ALL active employees in a company.
     */
    @Transactional
    public int bulkAllocate(Long companyId, Long leaveTypeId, double days, int year) {
        List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        for (Employee emp : employees) {
            allocateLeave(emp.getId(), leaveTypeId, days, year, companyId);
        }
        return employees.size();
    }

    // ─── Reconciliation ──────────────────────────────────────────────────────

    /**
     * One-time reconciliation: restores available_days and carryforward_days on
     * AvailableLeave rows from the matching ACTIVE LeaveAllocation record.
     *
     * Under the old deductBalance() logic, approving leave requests overwrote
     * availableDays with the remaining balance instead of keeping the allocation
     * constant. This method resets every corrupted row back to its true allocated
     * amount so that "Available Days" once again equals the assigned/allocation.
     *
     * Only rows where the current availableDays differs from the allocation are
     * updated (safe to re-run).
     *
     * @return the number of rows that were fixed
     */
    @Transactional
    public int reconcileAvailableDaysFromAllocations(Long companyId) {
        List<AvailableLeave> balances = availableLeaveRepository.findAll().stream()
                .filter(al -> al.getEmployee() != null && al.getEmployee().getCompany() != null
                        && al.getEmployee().getCompany().getId().equals(companyId))
                .toList();

        int fixed = 0;
        for (AvailableLeave al : balances) {
            Long empId = al.getEmployee().getId();
            Long ltId  = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
            if (ltId == null) continue;

            // Find the ACTIVE allocation for this employee+type (latest year)
            List<LeaveAllocation> allocs = leaveAllocationRepository.findByEmployeeId(empId);
            LeaveAllocation activeAlloc = allocs.stream()
                    .filter(a -> a.getLeaveType() != null && a.getLeaveType().getId().equals(ltId)
                            && a.getStatus() == LeaveAllocation.AllocationStatus.ACTIVE)
                    .max((a, b) -> Integer.compare(
                            a.getYear() != null ? a.getYear() : 0,
                            b.getYear() != null ? b.getYear() : 0))
                    .orElse(null);

            if (activeAlloc == null) continue;

            double allocAvail = activeAlloc.getAvailableDays() != null ? activeAlloc.getAvailableDays() : 0.0;
            double allocCf    = activeAlloc.getCarryforwardDays() != null ? activeAlloc.getCarryforwardDays() : 0.0;
            double allocTotal  = activeAlloc.getTotalLeaveDays() != null ? activeAlloc.getTotalLeaveDays() : 0.0;

            double currentAvail = al.getAvailableDays() != null ? al.getAvailableDays() : 0.0;
            double currentTotal = al.getTotalLeaveDays() != null ? al.getTotalLeaveDays() : 0.0;

            // Only patch if the allocation has diverged from the source-of-truth
            if (Math.abs(currentAvail - allocAvail) > 0.01 || Math.abs(currentTotal - allocTotal) > 0.01) {
                al.setAvailableDays(allocAvail);
                al.setCarryforwardDays(allocCf);
                al.setTotalLeaveDays(allocTotal);
                availableLeaveRepository.save(al);
                fixed++;
                log.info("Reconciled: employee={} leaveType={} avail {}→{} cf 0→{} total {}→{}",
                        empId, ltId, currentAvail, allocAvail, allocCf, currentTotal, allocTotal);
            }
        }
        log.info("Reconciliation complete for company {}: {} rows fixed out of {} scanned", companyId, fixed, balances.size());
        return fixed;
    }

    // ─── Annual Carry-Forward & Reset ─────────────────────────────────────────

    /**
     * Performs annual leave reset for a company:
     * - Expires the current year's allocations
     * - Creates next year's allocations applying carry-forward rules from LeaveType
     * - Updates AvailableLeave balances accordingly
     */
    @Transactional
    public void annualReset(Long companyId, int currentYear) {
        int nextYear = currentYear + 1;

        // Idempotency guard: skip if next year's allocations already exist as ACTIVE
        List<LeaveAllocation> existingNext = leaveAllocationRepository.findByCompanyIdAndYear(companyId, nextYear);
        boolean alreadyReset = existingNext.stream()
                .anyMatch(a -> a.getStatus() == LeaveAllocation.AllocationStatus.ACTIVE);
        if (alreadyReset) {
            log.info("Annual reset already run for year {} in company {}, skipping", nextYear, companyId);
            return;
        }

        List<LeaveAllocation> currentAllocations = leaveAllocationRepository.findByCompanyIdAndYear(companyId, currentYear);

        for (LeaveAllocation current : currentAllocations) {
            LeaveType leaveType = current.getLeaveType();
            double remainingDays = current.getAvailableDays() != null ? current.getAvailableDays() : 0.0;
            double carryForward = 0.0;

            switch (leaveType.getCarryforwardType()) {
                case CARRYFORWARD:
                    // Carry forward remaining days, capped by carryforwardMax
                    carryForward = remainingDays;
                    if (leaveType.getCarryforwardMax() != null && carryForward > leaveType.getCarryforwardMax()) {
                        carryForward = leaveType.getCarryforwardMax();
                    }
                    break;
                case CARRYFORWARD_EXPIRE:
                    // Same cap, but mark expiry date (carried days expire mid-year)
                    carryForward = remainingDays;
                    if (leaveType.getCarryforwardMax() != null && carryForward > leaveType.getCarryforwardMax()) {
                        carryForward = leaveType.getCarryforwardMax();
                    }
                    break;
                case NO_CARRYFORWARD:
                default:
                    carryForward = 0.0;
                    break;
            }

            // Expire current allocation
            current.setStatus(LeaveAllocation.AllocationStatus.EXPIRED);
            leaveAllocationRepository.save(current);

            // Create next year's allocation
            double baseDays = leaveType.getTotalDays() != null ? leaveType.getTotalDays().doubleValue() : 0.0;
            double totalNextYear = baseDays + carryForward;

            LeaveAllocation next = leaveAllocationRepository
                    .findByEmployeeIdAndLeaveTypeIdAndYear(
                            current.getEmployee().getId(), leaveType.getId(), nextYear)
                    .orElseGet(() -> {
                        LeaveAllocation n = new LeaveAllocation();
                        n.setEmployee(current.getEmployee());
                        n.setLeaveType(leaveType);
                        n.setYear(nextYear);
                        n.setCompany(current.getCompany());
                        return n;
                    });
            next.setTotalLeaveDays(totalNextYear);
            next.setAvailableDays(totalNextYear);
            next.setCarryforwardDays(carryForward);
            next.setStatus(LeaveAllocation.AllocationStatus.ACTIVE);
            leaveAllocationRepository.save(next);

            // Sync AvailableLeave
            AvailableLeave balance = getOrCreateAvailableLeave(
                    current.getEmployee().getId(), leaveType.getId());
            balance.setAvailableDays(totalNextYear);
            balance.setTotalLeaveDays(totalNextYear);
            balance.setCarryforwardDays(carryForward);
            balance.setAssignedDate(LocalDate.of(nextYear, 1, 1));
            balance.setResetDate(LocalDate.of(nextYear, 1, 1));
            if (leaveType.getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE) {
                balance.setExpiredDate(computeCarryforwardExpireDate(leaveType, nextYear));
            }
            availableLeaveRepository.save(balance);

            log.info("Annual reset: employee={} leaveType={} carryForward={} nextYearTotal={}",
                    current.getEmployee().getId(), leaveType.getName(), carryForward, totalNextYear);
        }
    }

    // ─── Working Days Calculation ─────────────────────────────────────────────

    /**
     * Calculates the number of working days between start and end (inclusive),
     * excluding weekends, company-defined holidays, allocated holidays, and company leaves.
     */
    public double calculateWorkingDays(LocalDate start, LocalDate end, Long companyId, LeaveType leaveType) {
        return calculateWorkingDays(start, end, companyId, leaveType, null);
    }

    public double calculateWorkingDays(LocalDate start, LocalDate end, Long companyId, LeaveType leaveType, Long employeeId) {
        // Build exclusion set
        Set<LocalDate> excludedDates = new HashSet<>();

        if (Boolean.TRUE.equals(leaveType.getExcludeHoliday()) && companyId != null) {
            // Company-wide holidays
            List<Holiday> holidays = holidayRepository.findByCompanyIdAndDateRange(companyId, start, end);
            for (Holiday h : holidays) {
                // FIX #3: guard against null endDate (single-day holidays created without one)
                LocalDate hEnd = h.getEndDate() != null ? h.getEndDate() : h.getStartDate();
                LocalDate d = h.getStartDate();
                while (!d.isAfter(hEnd)) {
                    excludedDates.add(d);
                    d = d.plusDays(1);
                }
            }
            // Employee/department-specific allocated holidays
            if (employeeId != null) {
                Employee emp = employeeRepository.findById(employeeId).orElse(null);
                Long deptId = (emp != null && emp.getDepartment() != null) ? emp.getDepartment().getId() : null;
                List<HolidayAllocation> allocated = (deptId != null)
                        ? holidayAllocationRepository.findApplicableForEmployee(companyId, employeeId, deptId)
                        : holidayAllocationRepository.findByEmployeeId(employeeId);
                for (HolidayAllocation ha : allocated) {
                    Holiday h = ha.getHoliday();
                    if (h.getStartDate() != null && h.getEndDate() != null) {
                        LocalDate d = h.getStartDate().isBefore(start) ? start : h.getStartDate();
                        LocalDate hEnd = h.getEndDate().isAfter(end) ? end : h.getEndDate();
                        while (!d.isAfter(hEnd)) {
                            excludedDates.add(d);
                            d = d.plusDays(1);
                        }
                    }
                }
            }
        }

        if (Boolean.TRUE.equals(leaveType.getExcludeCompanyLeave()) && companyId != null) {
            List<CompanyLeave> companyLeaves = companyLeaveRepository.findByCompanyId(companyId);
            for (CompanyLeave cl : companyLeaves) {
                if (Boolean.TRUE.equals(cl.getBasedOnWeekDay()) && cl.getWeekDay() != null) {
                    // Mark all occurrences of this weekday in the range
                    LocalDate d = start;
                    while (!d.isAfter(end)) {
                        // Java DayOfWeek: Monday=1 … Sunday=7; Horilla weekday: 0=Monday … 6=Sunday
                        int javaDow = d.getDayOfWeek().getValue(); // 1-7
                        int horillaStyle = javaDow - 1; // 0-6
                        if (horillaStyle == cl.getWeekDay()) {
                            excludedDates.add(d);
                        }
                        d = d.plusDays(1);
                    }
                } else if (cl.getStartDate() != null && cl.getEndDate() != null) {
                    LocalDate d = cl.getStartDate().isBefore(start) ? start : cl.getStartDate();
                    LocalDate clEnd = cl.getEndDate().isAfter(end) ? end : cl.getEndDate();
                    while (!d.isAfter(clEnd)) {
                        excludedDates.add(d);
                        d = d.plusDays(1);
                    }
                }
            }
        }

        boolean skipWeekends = Boolean.TRUE.equals(leaveType.getExcludeWeekend());
        long days = 0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            if (skipWeekends
                    && (current.getDayOfWeek() == DayOfWeek.SATURDAY
                        || current.getDayOfWeek() == DayOfWeek.SUNDAY)) {
                current = current.plusDays(1);
                continue;
            }
            if (!excludedDates.contains(current)) {
                days++;
            }
            current = current.plusDays(1);
        }
        return days;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    private AvailableLeave getOrCreateAvailableLeave(Long employeeId, Long leaveTypeId) {
        return availableLeaveRepository.findByEmployeeIdAndLeaveTypeId(employeeId, leaveTypeId)
                .orElseGet(() -> {
                    AvailableLeave av = new AvailableLeave();
                    av.setEmployee(employeeRepository.getReferenceById(employeeId));
                    av.setLeaveType(leaveTypeRepository.getReferenceById(leaveTypeId));
                    av.setAvailableDays(0.0);
                    av.setTotalLeaveDays(0.0);
                    av.setCarryforwardDays(0.0);
                    return av;
                });
    }

    /**
     * Records how many days were drawn from available vs carryforward on the request (for audit).
     *
     * NOTE: the allocation (available_days / carryforward_days) is intentionally left UNCHANGED.
     * "Available Days" is the allocated/assigned amount — a constant. The remaining balance is
     * DERIVED as (totalLeaveDays − usedDays) by the /balance endpoints and the UI, never stored
     * by overwriting the allocation. See computeRemaining().
     */
    private void deductBalance(AvailableLeave balance, double days, LeaveRequest request) {
        double avail = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        if (days > avail) {
            request.setApprovedAvailableDays(avail);
            request.setApprovedCarryforwardDays(days - avail);
        } else {
            request.setApprovedAvailableDays(days);
            request.setApprovedCarryforwardDays(0.0);
        }
        // No setAvailableDays / no save — allocation stays constant; "remaining" is derived.
    }

    /**
     * Computes the carryforward expiry date from LeaveType config.
     * Uses carryforwardExpireDate if set, otherwise derives from carryforwardExpireIn + carryforwardExpirePeriod
     * relative to Jan 1 of the given year. Falls back to June 30 if no config found.
     */
    private LocalDate computeCarryforwardExpireDate(LeaveType leaveType, int year) {
        if (leaveType.getCarryforwardExpireDate() != null) {
            return leaveType.getCarryforwardExpireDate();
        }
        if (leaveType.getCarryforwardExpireIn() != null && leaveType.getCarryforwardExpirePeriod() != null) {
            LocalDate base = LocalDate.of(year, 1, 1);
            int amount = leaveType.getCarryforwardExpireIn();
            return switch (leaveType.getCarryforwardExpirePeriod()) {
                case "day"   -> base.plusDays(amount);
                case "month" -> base.plusMonths(amount);
                case "year"  -> base.plusYears(amount);
                default      -> LocalDate.of(year, 6, 30);
            };
        }
        return LocalDate.of(year, 6, 30);
    }

    /**
     * No-op for the stored allocation: since deductBalance() no longer decrements the allocation,
     * there is nothing to restore when a request is rejected/cancelled. The approved/used total
     * drops automatically because the request's status moves out of APPROVED (so the
     * sumApprovedDays... queries stop counting it). The per-request approved*Days audit fields
     * remain on the request for history.
     */
    private void restoreBalance(Long employeeId, Long leaveTypeId, LeaveRequest request) {
        // Intentionally empty — allocation is constant; "remaining" is derived (Total − Used).
    }

    /**
     * Computes the REAL remaining leave days for an employee+type using the same source of truth
     * as the /balance endpoints: (available + carryforward) − used, where used = sum of APPROVED
     * request days. Already credited carryforward is preserved; reset policy governs future credits.
     * This replaces the old pattern of
     * reading availableDays directly as "remaining" (which coupled allocation to consumption).
     */
    private double computeRemaining(AvailableLeave balance, Long employeeId, Long leaveTypeId, LocalDate balanceDate) {
        LeavePeriodResolver.Period period = LeavePeriodResolver.containing(
                balance.getLeaveType(), balanceDate != null ? balanceDate : LocalDate.now());
        Double usedValue = leaveRequestRepository.sumApprovedDaysForPeriod(
                employeeId, leaveTypeId, period.start(), period.end());
        double used = usedValue != null ? usedValue : 0.0;
        return balance.creditedTotalDays() - used;
    }
}
