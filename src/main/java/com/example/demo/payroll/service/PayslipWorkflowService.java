package com.example.demo.payroll.service;

import com.example.demo.audit.AuditService;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.entity.Payslip.PayslipStatus;
import com.example.demo.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PAY-006: Draft -> Pending (REVIEW_ONGOING) -> Approved (CONFIRMED) -> Paid status workflow.
 * This is the single sanctioned path for changing a payslip's status — PayrollController's
 * generic patchPayslip/inlineEditPayslip endpoints reject status changes and PAID-locked edits,
 * so every transition (single or bulk) is validated and audited here.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PayslipWorkflowService {

    private final PayslipRepository payslipRepository;
    private final AuditService auditService;

    public static class BulkResult {
        public List<Long> succeeded = new ArrayList<>();
        public List<Map<String, Object>> failed = new ArrayList<>();
    }

    // ─── Submit: DRAFT -> REVIEW_ONGOING (HR prepares and submits) ─────────────

    public Payslip submit(Long id, Long userId, String userName) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        transition(p, PayslipStatus.DRAFT, PayslipStatus.REVIEW_ONGOING, userId, userName, "SUBMITTED");
        return payslipRepository.save(p);
    }

    public BulkResult submitBulk(List<Long> ids, Long userId, String userName) {
        return runBulk(ids, id -> submit(id, userId, userName));
    }

    // ─── Approve: REVIEW_ONGOING -> CONFIRMED (Accountant verifies) ────────────

    public Payslip approve(Long id, Long userId, String userName) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        transition(p, PayslipStatus.REVIEW_ONGOING, PayslipStatus.CONFIRMED, userId, userName, "APPROVED");
        return payslipRepository.save(p);
    }

    public BulkResult approveBulk(List<Long> ids, Long userId, String userName) {
        return runBulk(ids, id -> approve(id, userId, userName));
    }

    // ─── Mark Paid: CONFIRMED -> PAID (Accountant processes payment) ───────────

    public Payslip markPaid(Long id, String paymentReference, LocalDate paymentDate, Long userId, String userName) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        Map<String, Object> before = snapshot(p);
        if (p.getStatus() != PayslipStatus.CONFIRMED) {
            throw new BadRequestException("Payslip must be Approved before it can be marked Paid");
        }
        p.setStatus(PayslipStatus.PAID);
        p.setPaymentDate(paymentDate != null ? paymentDate : LocalDate.now());
        p.setPaymentReference(paymentReference);
        p.setMarkedPaidByUserId(userId);
        p.setMarkedPaidByName(userName);
        Payslip saved = payslipRepository.save(p);
        auditService.log("Payslip", saved.getId(), "PAID", before, snapshot(saved));
        return saved;
    }

    public BulkResult markPaidBulk(List<Long> ids, String paymentReference, LocalDate paymentDate, Long userId, String userName) {
        return runBulk(ids, id -> markPaid(id, paymentReference, paymentDate, userId, userName));
    }

    // ─── Reopen: PAID -> CONFIRMED (explicit authorization + audit trail, req #15) ──

    public Payslip reopen(Long id, String reason, Long userId, String userName) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A reason is required to reopen a paid payslip");
        }
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        Map<String, Object> before = snapshot(p);
        if (p.getStatus() != PayslipStatus.PAID) {
            throw new BadRequestException("Only a Paid payslip can be reopened");
        }
        p.setStatus(PayslipStatus.CONFIRMED);
        p.setPaymentDate(null);
        p.setPaymentReference(null);
        p.setMarkedPaidByUserId(null);
        p.setMarkedPaidByName(null);
        Payslip saved = payslipRepository.save(p);
        Map<String, Object> after = snapshot(saved);
        after.put("reopenReason", reason);
        after.put("reopenedByUserId", userId);
        after.put("reopenedByName", userName);
        auditService.log("Payslip", saved.getId(), "REOPENED", before, after);
        return saved;
    }

    // ─── Bulk "select all" resolution for a payroll month (req #10) ───────────

    public List<Long> resolvePeriodIds(Long companyId, LocalDate periodStart, LocalDate periodEnd, PayslipStatus expectedStatus) {
        return payslipRepository.findByCompanyIdAndStartDateBetweenAndStatus(companyId, periodStart, periodEnd, expectedStatus)
                .stream().map(Payslip::getId).toList();
    }

    // ─── Shared helpers ─────────────────────────────────────────────────────────

    private void transition(Payslip p, PayslipStatus expected, PayslipStatus next,
                             Long userId, String userName, String action) {
        if (p.getStatus() != expected) {
            throw new BadRequestException("Payslip must be in " + label(expected) + " status for this action (currently " + label(p.getStatus()) + ")");
        }
        Map<String, Object> before = snapshot(p);
        p.setStatus(next);
        Map<String, Object> after = snapshot(p);
        after.put("actedByUserId", userId);
        after.put("actedByName", userName);
        auditService.log("Payslip", p.getId(), action, before, after);
    }

    private BulkResult runBulk(List<Long> ids, java.util.function.Function<Long, Payslip> op) {
        BulkResult result = new BulkResult();
        String batchId = UUID.randomUUID().toString();
        for (Long id : ids) {
            try {
                op.apply(id);
                result.succeeded.add(id);
            } catch (Exception e) {
                Map<String, Object> failure = new HashMap<>();
                failure.put("id", id);
                failure.put("reason", e.getMessage());
                result.failed.add(failure);
                log.warn("[PayslipWorkflowService] Bulk action failed for payslip id={} (batch={}): {}", id, batchId, e.getMessage());
            }
        }
        return result;
    }

    private Map<String, Object> snapshot(Payslip p) {
        Map<String, Object> m = new HashMap<>();
        m.put("employeeId", p.getEmployee() != null ? p.getEmployee().getId() : null);
        m.put("status", p.getStatus());
        m.put("netPay", p.getNetPay());
        m.put("startDate", p.getStartDate());
        m.put("endDate", p.getEndDate());
        m.put("paymentDate", p.getPaymentDate());
        m.put("paymentReference", p.getPaymentReference());
        return m;
    }

    private String label(PayslipStatus status) {
        return switch (status) {
            case DRAFT -> "Draft";
            case REVIEW_ONGOING -> "Pending";
            case CONFIRMED -> "Approved";
            case PAID -> "Paid";
        };
    }
}
