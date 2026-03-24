package com.example.demo.payroll.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.*;
import com.example.demo.payroll.repository.*;
import com.example.demo.payroll.service.PayrollService;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@Tag(name = "Payroll")
public class PayrollController {

    private final PayrollService payrollService;
    private final ContractRepository contractRepository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final FilingStatusRepository filingStatusRepository;
    private final TaxBracketRepository taxBracketRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final PayrollSettingsRepository payrollSettingsRepository;
    private final MultipleConditionRepository multipleConditionRepository;
    private final ReimbursementAttachmentRepository reimbursementAttachmentRepository;
    private final ReimbursementCommentRepository reimbursementCommentRepository;
    private final PayrollGeneralSettingRepository payrollGeneralSettingRepository;
    private final EncashmentGeneralSettingRepository encashmentGeneralSettingRepository;
    private final PayslipAutoGenerateRepository payslipAutoGenerateRepository;

    @GetMapping("/contracts")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Contract>> listContracts() {
        var spec = ScopeFilter.<Contract>byEmployee();
        return ResponseEntity.ok(spec != null ? contractRepository.findAll(spec) : contractRepository.findAll());
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    public ResponseEntity<Contract> getContract(@PathVariable Long id) {
        return ResponseEntity.ok(contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", id)));
    }

    @PostMapping("/contracts")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    public ResponseEntity<Contract> createContract(@RequestBody Contract contract) {
        if (contract.getEmployee() != null && contract.getEmployee().getId() != null) {
            contract.setEmployee(employeeRepository.getReferenceById(contract.getEmployee().getId()));
        }
        if (contract.getCompany() != null && contract.getCompany().getId() != null) {
            contract.setCompany(companyRepository.getReferenceById(contract.getCompany().getId()));
        }
        return ResponseEntity.ok(contractRepository.save(contract));
    }

    @PutMapping("/contracts/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    public ResponseEntity<Contract> updateContract(@PathVariable Long id, @RequestBody Contract updated) {
        Contract c = contractRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract", id));
        c.setContractName(updated.getContractName());
        c.setStartDate(updated.getStartDate());
        c.setEndDate(updated.getEndDate());
        c.setWage(updated.getWage());
        c.setWageType(updated.getWageType());
        c.setContractStatus(updated.getContractStatus());
        c.setNoticePeriodInDays(updated.getNoticePeriodInDays());
        return ResponseEntity.ok(contractRepository.save(c));
    }

    @DeleteMapping("/contracts/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    public ResponseEntity<Map<String, String>> deleteContract(@PathVariable Long id) {
        Contract c = contractRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract", id));
        contractRepository.delete(c);
        return ResponseEntity.ok(Map.of("message", "Contract deleted"));
    }

    @GetMapping("/payslips")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Payslip>> listPayslips() {
        var spec = ScopeFilter.<Payslip>byEmployee();
        return ResponseEntity.ok(spec != null ? payslipRepository.findAll(spec) : payslipRepository.findAll());
    }

    @GetMapping("/payslips/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    public ResponseEntity<Payslip> getPayslip(@PathVariable Long id) {
        return ResponseEntity.ok(payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id)));
    }

    @PostMapping("/payslips/{id}/confirm")
    @PreAuthorize("hasAuthority('payroll:approve')")
    public ResponseEntity<Payslip> confirmPayslip(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        p.setStatus(Payslip.PayslipStatus.CONFIRMED);
        return ResponseEntity.ok(payslipRepository.save(p));
    }

    @PostMapping("/payslips/{id}/mark-paid")
    @PreAuthorize("hasAuthority('payroll:approve')")
    public ResponseEntity<Payslip> markPaid(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        p.setStatus(Payslip.PayslipStatus.PAID);
        return ResponseEntity.ok(payslipRepository.save(p));
    }

    @GetMapping("/employee/{employeeId}/payslips")
    @PreAuthorize("hasAuthority('payroll:view')")
    public ResponseEntity<List<Payslip>> employeePayslips(@PathVariable Long employeeId) {
        return ResponseEntity.ok(payslipRepository.findByEmployeeId(employeeId));
    }

    // ─── Filing Statuses ──────────────────────────────────────────────────────

    @GetMapping("/filing-statuses")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List filing statuses (company-scoped)")
    public ResponseEntity<List<FilingStatus>> listFilingStatuses() {
        var spec = ScopeFilter.<FilingStatus>byCompany();
        return ResponseEntity.ok(spec != null ? filingStatusRepository.findAll(spec) : filingStatusRepository.findAll());
    }

    @PostMapping("/filing-statuses")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a filing status")
    public ResponseEntity<FilingStatus> createFilingStatus(@RequestBody FilingStatus fs) {
        if (fs.getCompany() != null && fs.getCompany().getId() != null) {
            fs.setCompany(companyRepository.getReferenceById(fs.getCompany().getId()));
        }
        return ResponseEntity.ok(filingStatusRepository.save(fs));
    }

    @PutMapping("/filing-statuses/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a filing status")
    public ResponseEntity<FilingStatus> updateFilingStatus(@PathVariable Long id, @RequestBody FilingStatus updated) {
        FilingStatus fs = filingStatusRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FilingStatus", id));
        fs.setFilingStatus(updated.getFilingStatus());
        fs.setBasedOn(updated.getBasedOn());
        fs.setDescription(updated.getDescription());
        return ResponseEntity.ok(filingStatusRepository.save(fs));
    }

    @DeleteMapping("/filing-statuses/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a filing status")
    public ResponseEntity<Map<String, String>> deleteFilingStatus(@PathVariable Long id) {
        filingStatusRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Filing status deleted"));
    }

    // ─── Tax Brackets ─────────────────────────────────────────────────────────

    @GetMapping("/tax-brackets")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List tax brackets for a filing status")
    public ResponseEntity<List<TaxBracket>> listTaxBrackets(@RequestParam Long filingStatusId) {
        return ResponseEntity.ok(taxBracketRepository.findByFilingStatusId(filingStatusId));
    }

    @PostMapping("/tax-brackets")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a tax bracket")
    public ResponseEntity<TaxBracket> createTaxBracket(@RequestBody TaxBracket bracket) {
        if (bracket.getFilingStatus() != null && bracket.getFilingStatus().getId() != null) {
            bracket.setFilingStatus(filingStatusRepository.getReferenceById(bracket.getFilingStatus().getId()));
        }
        return ResponseEntity.ok(taxBracketRepository.save(bracket));
    }

    @PutMapping("/tax-brackets/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a tax bracket")
    public ResponseEntity<TaxBracket> updateTaxBracket(@PathVariable Long id, @RequestBody TaxBracket updated) {
        TaxBracket b = taxBracketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TaxBracket", id));
        b.setMinIncome(updated.getMinIncome());
        b.setMaxIncome(updated.getMaxIncome());
        b.setTaxRate(updated.getTaxRate());
        return ResponseEntity.ok(taxBracketRepository.save(b));
    }

    @DeleteMapping("/tax-brackets/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a tax bracket")
    public ResponseEntity<Map<String, String>> deleteTaxBracket(@PathVariable Long id) {
        taxBracketRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Tax bracket deleted"));
    }

    // ─── Loans ────────────────────────────────────────────────────────────────

    @GetMapping("/loans")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List loan accounts (company-scoped)")
    public ResponseEntity<List<LoanAccount>> listLoans() {
        var spec = ScopeFilter.<LoanAccount>byEmployee();
        return ResponseEntity.ok(spec != null ? loanAccountRepository.findAll(spec) : loanAccountRepository.findAll());
    }

    @PostMapping("/loans")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a loan account")
    public ResponseEntity<LoanAccount> createLoan(@RequestBody LoanAccount loan) {
        if (loan.getEmployee() != null && loan.getEmployee().getId() != null) {
            loan.setEmployee(employeeRepository.getReferenceById(loan.getEmployee().getId()));
        }
        if (loan.getCompany() != null && loan.getCompany().getId() != null) {
            loan.setCompany(companyRepository.getReferenceById(loan.getCompany().getId()));
        }
        return ResponseEntity.ok(loanAccountRepository.save(loan));
    }

    @PostMapping("/loans/{id}/settle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Mark a loan as settled")
    public ResponseEntity<LoanAccount> settleLoan(@PathVariable Long id) {
        LoanAccount loan = loanAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", id));
        loan.setSettled(true);
        loan.setSettledDate(LocalDateTime.now());
        return ResponseEntity.ok(loanAccountRepository.save(loan));
    }

    // ─── Reimbursements ───────────────────────────────────────────────────────

    @GetMapping("/reimbursements")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List reimbursement requests (company-scoped)")
    public ResponseEntity<List<Reimbursement>> listReimbursements() {
        var spec = ScopeFilter.<Reimbursement>byEmployee();
        return ResponseEntity.ok(spec != null ? reimbursementRepository.findAll(spec) : reimbursementRepository.findAll());
    }

    @PostMapping("/reimbursements")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    @Operation(summary = "Submit a reimbursement request")
    public ResponseEntity<Reimbursement> createReimbursement(@RequestBody Reimbursement reimbursement) {
        if (reimbursement.getEmployee() != null && reimbursement.getEmployee().getId() != null) {
            reimbursement.setEmployee(employeeRepository.getReferenceById(reimbursement.getEmployee().getId()));
        }
        if (reimbursement.getCompany() != null && reimbursement.getCompany().getId() != null) {
            reimbursement.setCompany(companyRepository.getReferenceById(reimbursement.getCompany().getId()));
        }
        reimbursement.setStatus(Reimbursement.ReimbursementStatus.REQUESTED);
        return ResponseEntity.ok(reimbursementRepository.save(reimbursement));
    }

    @PostMapping("/reimbursements/{id}/approve")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Transactional
    @Operation(summary = "Approve a reimbursement request")
    public ResponseEntity<Reimbursement> approveReimbursement(@PathVariable Long id) {
        Reimbursement r = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement", id));
        r.setStatus(Reimbursement.ReimbursementStatus.APPROVED);
        return ResponseEntity.ok(reimbursementRepository.save(r));
    }

    @PostMapping("/reimbursements/{id}/reject")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Transactional
    @Operation(summary = "Reject a reimbursement request")
    public ResponseEntity<Reimbursement> rejectReimbursement(@PathVariable Long id) {
        Reimbursement r = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement", id));
        r.setStatus(Reimbursement.ReimbursementStatus.REJECTED);
        return ResponseEntity.ok(reimbursementRepository.save(r));
    }

    // ─── Payroll Settings ─────────────────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get payroll settings for company")
    public ResponseEntity<PayrollSettings> getSettings(@RequestParam Long companyId) {
        return payrollSettingsRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update payroll settings")
    public ResponseEntity<PayrollSettings> updateSettings(@RequestParam Long companyId,
                                                           @RequestBody PayrollSettings updated) {
        PayrollSettings s = payrollSettingsRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    PayrollSettings n = new PayrollSettings();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setCurrencySymbol(updated.getCurrencySymbol());
        s.setCurrencyPosition(updated.getCurrencyPosition());
        return ResponseEntity.ok(payrollSettingsRepository.save(s));
    }

    // ─── Payroll General Settings ──────────────────────────────────────────────

    @GetMapping("/general-settings")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get payroll general settings for company")
    public ResponseEntity<PayrollGeneralSetting> getGeneralSettings(@RequestParam Long companyId) {
        return payrollGeneralSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/general-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert payroll general settings")
    public ResponseEntity<PayrollGeneralSetting> upsertGeneralSettings(@RequestParam Long companyId,
                                                                        @RequestBody PayrollGeneralSetting body) {
        PayrollGeneralSetting s = payrollGeneralSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    PayrollGeneralSetting n = new PayrollGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setRoundOff(body.getRoundOff());
        s.setEnableEncashment(body.getEnableEncashment());
        s.setEnableBonusPoint(body.getEnableBonusPoint());
        s.setMaxOvertimeHours(body.getMaxOvertimeHours());
        s.setPayrollStartDay(body.getPayrollStartDay());
        return ResponseEntity.ok(payrollGeneralSettingRepository.save(s));
    }

    // ─── Encashment Settings ──────────────────────────────────────────────────

    @GetMapping("/encashment-settings")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get encashment settings for company")
    public ResponseEntity<EncashmentGeneralSetting> getEncashmentSettings(@RequestParam Long companyId) {
        return encashmentGeneralSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/encashment-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert encashment settings")
    public ResponseEntity<EncashmentGeneralSetting> upsertEncashmentSettings(@RequestParam Long companyId,
                                                                              @RequestBody EncashmentGeneralSetting body) {
        EncashmentGeneralSetting s = encashmentGeneralSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    EncashmentGeneralSetting n = new EncashmentGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setEnableSelfEncashment(body.getEnableSelfEncashment());
        s.setMaxEncashmentDays(body.getMaxEncashmentDays());
        s.setMinAccrualBeforeEncashment(body.getMinAccrualBeforeEncashment());
        return ResponseEntity.ok(encashmentGeneralSettingRepository.save(s));
    }

    // ─── Payslip Auto-Generate ────────────────────────────────────────────────

    @GetMapping("/payslip-auto-generate")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get payslip auto-generate config for company")
    public ResponseEntity<PayslipAutoGenerate> getPayslipAutoGenerate(@RequestParam Long companyId) {
        return payslipAutoGenerateRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/payslip-auto-generate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert payslip auto-generate config")
    public ResponseEntity<PayslipAutoGenerate> upsertPayslipAutoGenerate(@RequestParam Long companyId,
                                                                          @RequestBody PayslipAutoGenerate body) {
        PayslipAutoGenerate s = payslipAutoGenerateRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    PayslipAutoGenerate n = new PayslipAutoGenerate();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setIsEnabled(body.getIsEnabled());
        s.setGenerateDay(body.getGenerateDay());
        s.setNotifyEmail(body.getNotifyEmail());
        return ResponseEntity.ok(payslipAutoGenerateRepository.save(s));
    }

    // ─── Multiple Conditions (Allowance / Deduction rules) ───────────────────

    @GetMapping("/conditions")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "List conditions for an allowance or deduction")
    public ResponseEntity<List<MultipleCondition>> listConditions(
            @RequestParam(required = false) Long allowanceId,
            @RequestParam(required = false) Long deductionId) {
        if (allowanceId != null) return ResponseEntity.ok(multipleConditionRepository.findByAllowanceId(allowanceId));
        if (deductionId != null) return ResponseEntity.ok(multipleConditionRepository.findByDeductionId(deductionId));
        return ResponseEntity.ok(multipleConditionRepository.findAll());
    }

    @PostMapping("/conditions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a payroll condition")
    public ResponseEntity<MultipleCondition> createCondition(@RequestBody MultipleCondition condition) {
        return ResponseEntity.ok(multipleConditionRepository.save(condition));
    }

    @PutMapping("/conditions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a payroll condition")
    public ResponseEntity<MultipleCondition> updateCondition(@PathVariable Long id,
                                                              @RequestBody MultipleCondition updated) {
        MultipleCondition c = multipleConditionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MultipleCondition", id));
        c.setField(updated.getField());
        c.setConditionType(updated.getConditionType());
        c.setValue(updated.getValue());
        c.setIsAllowance(updated.getIsAllowance());
        return ResponseEntity.ok(multipleConditionRepository.save(c));
    }

    @DeleteMapping("/conditions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a payroll condition")
    public ResponseEntity<Map<String, String>> deleteCondition(@PathVariable Long id) {
        multipleConditionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Condition deleted"));
    }

    // ─── Reimbursement Attachments ────────────────────────────────────────────

    @GetMapping("/reimbursements/{reimbursementId}/attachments")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "List attachments for a reimbursement")
    public ResponseEntity<List<ReimbursementAttachment>> listReimbursementAttachments(
            @PathVariable Long reimbursementId) {
        return ResponseEntity.ok(reimbursementAttachmentRepository.findByReimbursementId(reimbursementId));
    }

    @PostMapping("/reimbursements/{reimbursementId}/attachments")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    @Operation(summary = "Add an attachment to a reimbursement")
    public ResponseEntity<ReimbursementAttachment> addReimbursementAttachment(
            @PathVariable Long reimbursementId, @RequestBody ReimbursementAttachment attachment) {
        attachment.setReimbursement(reimbursementRepository.getReferenceById(reimbursementId));
        return ResponseEntity.ok(reimbursementAttachmentRepository.save(attachment));
    }

    @DeleteMapping("/reimbursements/attachments/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Operation(summary = "Delete a reimbursement attachment")
    public ResponseEntity<Map<String, String>> deleteReimbursementAttachment(@PathVariable Long id) {
        reimbursementAttachmentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Attachment deleted"));
    }

    // ─── Reimbursement Comments ───────────────────────────────────────────────

    @GetMapping("/reimbursements/{reimbursementId}/comments")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "List comments for a reimbursement")
    public ResponseEntity<List<ReimbursementComment>> listReimbursementComments(
            @PathVariable Long reimbursementId) {
        return ResponseEntity.ok(reimbursementCommentRepository.findByReimbursementId(reimbursementId));
    }

    @PostMapping("/reimbursements/{reimbursementId}/comments")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    @Operation(summary = "Add a comment to a reimbursement")
    public ResponseEntity<ReimbursementComment> addReimbursementComment(
            @PathVariable Long reimbursementId, @RequestBody ReimbursementComment comment) {
        comment.setReimbursement(reimbursementRepository.getReferenceById(reimbursementId));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(reimbursementCommentRepository.save(comment));
    }

    @DeleteMapping("/reimbursements/comments/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Operation(summary = "Delete a reimbursement comment")
    public ResponseEntity<Map<String, String>> deleteReimbursementComment(@PathVariable Long id) {
        reimbursementCommentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Comment deleted"));
    }

    // ─── Payslip Generation ───────────────────────────────────────────────────

    @PostMapping("/payslips/generate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Generate a payslip for a specific employee for the given pay period")
    public ResponseEntity<Payslip> generatePayslip(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam Long companyId) {
        return ResponseEntity.ok(payrollService.generatePayslip(employeeId, startDate, endDate, companyId));
    }

    @PostMapping("/payslips/generate/bulk")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Bulk-generate payslips for all active employees in a company")
    public ResponseEntity<List<Payslip>> generateBulkPayslips(
            @RequestParam Long companyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(payrollService.generateBulkPayslips(companyId, startDate, endDate));
    }

    // ─── Payslip PDF Download ──────────────────────────────────────────────────

    @GetMapping("/payslips/{id}/pdf")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Download a payslip as PDF")
    public ResponseEntity<byte[]> downloadPayslipPdf(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document();
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

            doc.add(new Paragraph("PAYSLIP", titleFont));
            doc.add(new Paragraph(" "));

            String empName = p.getEmployee() != null
                    ? (p.getEmployee().getFirstName() + " " + p.getEmployee().getLastName()).trim()
                    : "N/A";
            doc.add(new Paragraph("Employee: " + empName, headerFont));
            doc.add(new Paragraph("Period: " + p.getStartDate() + " – " + p.getEndDate(), normalFont));
            doc.add(new Paragraph("Status: " + (p.getStatus() != null ? p.getStatus().name() : "DRAFT"), normalFont));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("─────────────────────────────────────", normalFont));
            doc.add(new Paragraph("Basic Pay:       " + formatAmount(p.getBasicPay()), normalFont));
            doc.add(new Paragraph("Total Allowance: " + formatAmount(p.getTotalAllowance()), normalFont));
            doc.add(new Paragraph("Total Deduction: " + formatAmount(p.getTotalDeduction()), normalFont));
            doc.add(new Paragraph("─────────────────────────────────────", normalFont));
            doc.add(new Paragraph("Net Pay:         " + formatAmount(p.getNetPay()), headerFont));
            doc.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "payslip-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(baos.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate payslip PDF", e);
        }
    }

    private String formatAmount(java.math.BigDecimal amount) {
        return amount != null ? amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() : "0.00";
    }
}
