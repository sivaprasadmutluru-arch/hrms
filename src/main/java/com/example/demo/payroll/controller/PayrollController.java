package com.example.demo.payroll.controller;

import com.example.demo.base.repository.*;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.*;
import com.example.demo.payroll.repository.*;
import com.example.demo.payroll.service.PayrollScheduler;
import com.example.demo.payroll.service.PayrollService;
import com.example.demo.payroll.service.PayslipExcelExportService;
import com.example.demo.payroll.service.PayslipImportService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import java.awt.Color;
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

import org.springframework.web.multipart.MultipartFile;

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
    private final PayslipExcelExportService payslipExcelExportService;
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
    private final AllowanceRepository allowanceRepository;
    private final DeductionRepository deductionRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final PayrollBatchGroupRepository payrollBatchGroupRepository;
    private final PayrollScheduler payrollScheduler;
    private final PayslipImportService payslipImportService;

    @GetMapping("/contracts")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Contract>> listContracts() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || (scope.hasUnrestrictedAccess() && scope.getCompanyId() == null)) {
            return ResponseEntity.ok(contractRepository.findAllWithAssociations());
        }
        List<Long> companyIds = scope.hasUnrestrictedAccess()
                ? java.util.List.of(scope.getCompanyId())
                : scope.getAccessibleCompanyIds();
        if (companyIds.isEmpty()) return ResponseEntity.ok(java.util.List.of());
        // Merge contracts visible by contract.company_id OR by employee.company_id to handle
        // auto-generated contracts whose company field may differ from the employee's company.
        java.util.Set<Long> seen = new java.util.HashSet<>();
        java.util.List<Contract> result = new java.util.ArrayList<>();
        for (Contract c : contractRepository.findAllWithAssociationsByCompanyIdIn(companyIds)) {
            if (seen.add(c.getId())) result.add(c);
        }
        for (Contract c : contractRepository.findAllWithAssociationsByEmployeeCompanyIdIn(companyIds)) {
            if (seen.add(c.getId())) result.add(c);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    public ResponseEntity<Contract> getContract(@PathVariable Long id) {
        return ResponseEntity.ok(contractRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", id)));
    }

    @GetMapping("/contracts/employee/{employeeId}")
    @PreAuthorize("hasAuthority('payroll:view') or hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @io.swagger.v3.oas.annotations.Operation(summary = "Get contract for a specific employee (requires payroll:view or employee:view)")
    public ResponseEntity<Contract> getContractByEmployee(@PathVariable Long employeeId) {
        Contract contract = contractRepository.findByEmployeeId(employeeId)
                .stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Contract for employee", employeeId));
        return ResponseEntity.ok(contractRepository.findByIdWithAssociations(contract.getId()).orElse(contract));
    }

    @PostMapping("/contracts")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    public ResponseEntity<Contract> createContract(@RequestBody Contract contract) {
        if (contract.getEmployee() == null || contract.getEmployee().getId() == null) {
            return ResponseEntity.badRequest().build();
        }
        contract.setEmployee(employeeRepository.findById(contract.getEmployee().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", contract.getEmployee().getId())));
        Long companyId = (contract.getCompany() != null && contract.getCompany().getId() != null)
                ? contract.getCompany().getId() : CompanyContext.get();
        if (companyId != null) {
            contract.setCompany(companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
        }
        if (contract.getFilingStatus() != null && contract.getFilingStatus().getId() != null) {
            contract.setFilingStatus(filingStatusRepository.findById(contract.getFilingStatus().getId()).orElse(null));
        }
        if (contract.getDepartment() != null && contract.getDepartment().getId() != null) {
            contract.setDepartment(departmentRepository.findById(contract.getDepartment().getId()).orElse(null));
        }
        if (contract.getJobPosition() != null && contract.getJobPosition().getId() != null) {
            contract.setJobPosition(jobPositionRepository.findById(contract.getJobPosition().getId()).orElse(null));
        }
        if (contract.getJobRole() != null && contract.getJobRole().getId() != null) {
            contract.setJobRole(jobRoleRepository.findById(contract.getJobRole().getId()).orElse(null));
        }
        if (contract.getShift() != null && contract.getShift().getId() != null) {
            contract.setShift(shiftScheduleRepository.findById(contract.getShift().getId()).orElse(null));
        }
        if (contract.getWorkType() != null && contract.getWorkType().getId() != null) {
            contract.setWorkType(workTypeRepository.findById(contract.getWorkType().getId()).orElse(null));
        }
        contract.setTotalSalary(computeTotalSalary(contract));
        if (contract.getContractStatus() == null) {
            contract.setContractStatus(resolveContractStatus(contract.getStartDate(), contract.getEndDate()));
        }
        Contract saved = contractRepository.save(contract);
        return ResponseEntity.ok(contractRepository.findByIdWithAssociations(saved.getId()).orElse(saved));
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
        c.setPayFrequency(updated.getPayFrequency());
        c.setHousingAllowance(updated.getHousingAllowance());
        c.setTransportAllowance(updated.getTransportAllowance());
        c.setOtherAllowance(updated.getOtherAllowance());
        c.setContractStatus(updated.getContractStatus() != null
                ? updated.getContractStatus()
                : resolveContractStatus(updated.getStartDate(), updated.getEndDate()));
        c.setNoticePeriodInDays(updated.getNoticePeriodInDays());
        c.setDeductLeaveFromBasicPay(updated.getDeductLeaveFromBasicPay());
        c.setCalculateDailyLeaveAmount(updated.getCalculateDailyLeaveAmount());
        c.setDeductionForOneLeaveAmount(updated.getDeductionForOneLeaveAmount());
        c.setNote(updated.getNote());
        c.setContractDocument(updated.getContractDocument());
        if (updated.getEmployee() != null && updated.getEmployee().getId() != null) {
            c.setEmployee(employeeRepository.findById(updated.getEmployee().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", updated.getEmployee().getId())));
        }
        Long updatedCompanyId = (updated.getCompany() != null && updated.getCompany().getId() != null)
                ? updated.getCompany().getId() : CompanyContext.get();
        if (updatedCompanyId != null) {
            c.setCompany(companyRepository.findById(updatedCompanyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company", updatedCompanyId)));
        }
        if (updated.getFilingStatus() != null && updated.getFilingStatus().getId() != null) {
            c.setFilingStatus(filingStatusRepository.findById(updated.getFilingStatus().getId()).orElse(null));
        } else {
            c.setFilingStatus(null);
        }
        c.setDepartment(updated.getDepartment() != null && updated.getDepartment().getId() != null
                ? departmentRepository.findById(updated.getDepartment().getId()).orElse(null) : null);
        c.setJobPosition(updated.getJobPosition() != null && updated.getJobPosition().getId() != null
                ? jobPositionRepository.findById(updated.getJobPosition().getId()).orElse(null) : null);
        c.setJobRole(updated.getJobRole() != null && updated.getJobRole().getId() != null
                ? jobRoleRepository.findById(updated.getJobRole().getId()).orElse(null) : null);
        c.setShift(updated.getShift() != null && updated.getShift().getId() != null
                ? shiftScheduleRepository.findById(updated.getShift().getId()).orElse(null) : null);
        c.setWorkType(updated.getWorkType() != null && updated.getWorkType().getId() != null
                ? workTypeRepository.findById(updated.getWorkType().getId()).orElse(null) : null);
        c.setTotalSalary(computeTotalSalary(c));
        contractRepository.save(c);
        return ResponseEntity.ok(contractRepository.findByIdWithAssociations(c.getId()).orElse(c));
    }

    private java.math.BigDecimal computeTotalSalary(Contract c) {
        java.math.BigDecimal total = c.getWage() != null ? c.getWage() : java.math.BigDecimal.ZERO;
        if (c.getHousingAllowance() != null) total = total.add(c.getHousingAllowance());
        if (c.getTransportAllowance() != null) total = total.add(c.getTransportAllowance());
        if (c.getOtherAllowance() != null) total = total.add(c.getOtherAllowance());
        return total;
    }

    @DeleteMapping("/contracts/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    public ResponseEntity<Map<String, String>> deleteContract(@PathVariable Long id) {
        Contract c = contractRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract", id));
        contractRepository.delete(c);
        return ResponseEntity.ok(Map.of("message", "Contract deleted"));
    }

    // ─── Allowances ───────────────────────────────────────────────────────────

    @GetMapping("/allowances")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List allowances (company-scoped)")
    public ResponseEntity<List<Allowance>> listAllowances() {
        var spec = ScopeFilter.<Allowance>byCompany();
        return ResponseEntity.ok(spec != null ? allowanceRepository.findAll(spec) : allowanceRepository.findAll());
    }

    @GetMapping("/allowances/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "Get allowance by id")
    public ResponseEntity<Allowance> getAllowance(@PathVariable Long id) {
        return ResponseEntity.ok(allowanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allowance", id)));
    }

    @PostMapping("/allowances")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    @Operation(summary = "Create an allowance")
    public ResponseEntity<Allowance> createAllowance(@RequestBody Allowance allowance) {
        if (allowance.getCompany() != null && allowance.getCompany().getId() != null) {
            allowance.setCompany(companyRepository.getReferenceById(allowance.getCompany().getId()));
        }
        return ResponseEntity.ok(allowanceRepository.save(allowance));
    }

    @PutMapping("/allowances/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    @Operation(summary = "Update an allowance")
    public ResponseEntity<Allowance> updateAllowance(@PathVariable Long id, @RequestBody Allowance updated) {
        Allowance a = allowanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allowance", id));
        a.setTitle(updated.getTitle());
        a.setOneTimeDate(updated.getOneTimeDate());
        a.setIncludeActiveEmployees(updated.getIncludeActiveEmployees());
        a.setIsTaxable(updated.getIsTaxable());
        a.setIsConditionBased(updated.getIsConditionBased());
        a.setField(updated.getField());
        a.setCondition(updated.getCondition());
        a.setValue(updated.getValue());
        a.setIsFixed(updated.getIsFixed());
        a.setAmount(updated.getAmount());
        a.setBasedOn(updated.getBasedOn());
        a.setRate(updated.getRate());
        a.setPerAttendanceFixedAmount(updated.getPerAttendanceFixedAmount());
        a.setPerChildrenFixedAmount(updated.getPerChildrenFixedAmount());
        a.setShiftPerAttendanceAmount(updated.getShiftPerAttendanceAmount());
        a.setAmountPerOneHr(updated.getAmountPerOneHr());
        a.setWorkTypePerAttendanceAmount(updated.getWorkTypePerAttendanceAmount());
        a.setHasMaxLimit(updated.getHasMaxLimit());
        a.setMaximumAmount(updated.getMaximumAmount());
        a.setMaximumUnit(updated.getMaximumUnit());
        a.setIfChoice(updated.getIfChoice());
        a.setIfCondition(updated.getIfCondition());
        a.setIfAmount(updated.getIfAmount());
        a.setStartRange(updated.getStartRange());
        a.setEndRange(updated.getEndRange());
        a.setOnlyShowUnderEmployee(updated.getOnlyShowUnderEmployee());
        a.setIsLoan(updated.getIsLoan());
        return ResponseEntity.ok(allowanceRepository.save(a));
    }

    @DeleteMapping("/allowances/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Operation(summary = "Delete an allowance")
    public ResponseEntity<Map<String, String>> deleteAllowance(@PathVariable Long id) {
        allowanceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Allowance", id));
        allowanceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Allowance deleted"));
    }

    // ─── Deductions ───────────────────────────────────────────────────────────

    @GetMapping("/deductions")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List deductions (company-scoped)")
    public ResponseEntity<List<Deduction>> listDeductions() {
        var spec = ScopeFilter.<Deduction>byCompany();
        return ResponseEntity.ok(spec != null ? deductionRepository.findAll(spec) : deductionRepository.findAll());
    }

    @GetMapping("/deductions/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "Get deduction by id")
    public ResponseEntity<Deduction> getDeduction(@PathVariable Long id) {
        return ResponseEntity.ok(deductionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deduction", id)));
    }

    @PostMapping("/deductions")
    @PreAuthorize("hasAuthority('payroll:create')")
    @Transactional
    @Operation(summary = "Create a deduction")
    public ResponseEntity<Deduction> createDeduction(@RequestBody Deduction deduction) {
        if (deduction.getCompany() != null && deduction.getCompany().getId() != null) {
            deduction.setCompany(companyRepository.getReferenceById(deduction.getCompany().getId()));
        }
        return ResponseEntity.ok(deductionRepository.save(deduction));
    }

    @PutMapping("/deductions/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    @Operation(summary = "Update a deduction")
    public ResponseEntity<Deduction> updateDeduction(@PathVariable Long id, @RequestBody Deduction updated) {
        Deduction d = deductionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deduction", id));
        d.setTitle(updated.getTitle());
        d.setOneTimeDate(updated.getOneTimeDate());
        d.setIncludeActiveEmployees(updated.getIncludeActiveEmployees());
        d.setIsTax(updated.getIsTax());
        d.setIsPretax(updated.getIsPretax());
        d.setIsConditionBased(updated.getIsConditionBased());
        d.setField(updated.getField());
        d.setCondition(updated.getCondition());
        d.setValue(updated.getValue());
        d.setUpdateCompensation(updated.getUpdateCompensation());
        d.setIsFixed(updated.getIsFixed());
        d.setAmount(updated.getAmount());
        d.setBasedOn(updated.getBasedOn());
        d.setRate(updated.getRate());
        d.setEmployerRate(updated.getEmployerRate());
        d.setHasMaxLimit(updated.getHasMaxLimit());
        d.setMaximumAmount(updated.getMaximumAmount());
        d.setMaximumUnit(updated.getMaximumUnit());
        d.setIfChoice(updated.getIfChoice());
        d.setIfCondition(updated.getIfCondition());
        d.setIfAmount(updated.getIfAmount());
        d.setStartRange(updated.getStartRange());
        d.setEndRange(updated.getEndRange());
        d.setOnlyShowUnderEmployee(updated.getOnlyShowUnderEmployee());
        d.setIsInstallment(updated.getIsInstallment());
        return ResponseEntity.ok(deductionRepository.save(d));
    }

    @DeleteMapping("/deductions/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Operation(summary = "Delete a deduction")
    public ResponseEntity<Map<String, String>> deleteDeduction(@PathVariable Long id) {
        deductionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Deduction", id));
        deductionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deduction deleted"));
    }

    @GetMapping("/payslips")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Payslip>> listPayslips(
            @RequestParam(required = false) Boolean autoGenerated) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        List<Payslip> payslips;
        if (scope == null || (scope.hasUnrestrictedAccess() && scope.getCompanyId() == null)) {
            payslips = autoGenerated != null
                    ? payslipRepository.findAllWithAssociationsByAutoGenerated(autoGenerated)
                    : payslipRepository.findAllWithAssociations();
        } else {
            List<Long> companyIds = scope.hasUnrestrictedAccess()
                    ? java.util.List.of(scope.getCompanyId())
                    : scope.getAccessibleCompanyIds();
            if (companyIds.isEmpty()) return ResponseEntity.ok(java.util.List.of());
            payslips = autoGenerated != null
                    ? payslipRepository.findAllWithAssociationsByCompanyIdInAndAutoGenerated(companyIds, autoGenerated)
                    : payslipRepository.findAllWithAssociationsByCompanyIdIn(companyIds);
        }
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/{id}")
    @PreAuthorize("hasAuthority('payroll:view') or hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<Payslip> getPayslip(@PathVariable Long id) {
        return ResponseEntity.ok(payslipRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id)));
    }

    @PostMapping("/payslips/{id}/confirm")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Transactional
    public ResponseEntity<?> confirmPayslip(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        if (p.getStatus() != Payslip.PayslipStatus.DRAFT) {
            return ResponseEntity.badRequest().body("Payslip must be in DRAFT status to confirm");
        }
        p.setStatus(Payslip.PayslipStatus.CONFIRMED);
        payslipRepository.save(p);
        return ResponseEntity.ok(payslipRepository.findByIdWithAssociations(id).orElse(p));
    }

    @PostMapping("/payslips/{id}/mark-paid")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Transactional
    public ResponseEntity<?> markPaid(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        if (p.getStatus() != Payslip.PayslipStatus.CONFIRMED) {
            return ResponseEntity.badRequest().body("Payslip must be in CONFIRMED status to mark as paid");
        }
        p.setStatus(Payslip.PayslipStatus.PAID);
        payslipRepository.save(p);
        return ResponseEntity.ok(payslipRepository.findByIdWithAssociations(id).orElse(p));
    }

    @DeleteMapping("/payslips/{id}")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    public ResponseEntity<Void> deletePayslip(@PathVariable Long id) {
        payslipRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        payslipRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/payslips/bulk-delete")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    public ResponseEntity<Void> deletePayslipsBulk(@RequestBody List<Long> ids) {
        payslipRepository.deleteAllById(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/employee/{employeeId}/payslips")
    @PreAuthorize("hasAuthority('payroll:view') or hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
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
        fs.setUsePy(updated.getUsePy());
        fs.setPythonCode(updated.getPythonCode());
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
        List<LoanAccount> loans = spec != null ? loanAccountRepository.findAll(spec) : loanAccountRepository.findAll();
        // Populate paidInstallments (mirrors GCP installment_ratio numerator)
        for (LoanAccount loan : loans) {
            if (loan.getDeductionIds() != null && !loan.getDeductionIds().isEmpty()) {
                List<Long> deductionIds = loan.getDeductionIds().stream()
                        .map(d -> d.getId()).collect(java.util.stream.Collectors.toList());
                loan.setPaidInstallments((int) payslipRepository.countByInstallmentIdIn(deductionIds));
            } else {
                loan.setPaidInstallments(0);
            }
        }
        return ResponseEntity.ok(loans);
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

    @GetMapping("/reimbursements/{id}")
    @PreAuthorize("hasAuthority('payroll:view') or hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get a single reimbursement request by ID")
    public ResponseEntity<Reimbursement> getReimbursement(@PathVariable Long id) {
        return ResponseEntity.ok(reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement", id)));
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
        s.setNoticePeriod(body.getNoticePeriod());
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
        s.setBonusAmount(body.getBonusAmount());
        s.setLeaveAmount(body.getLeaveAmount());
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
        s.setAutoGenerate(body.getAutoGenerate());
        s.setGenerateDay(body.getGenerateDay());
        s.setGenerateTime(body.getGenerateTime());
        s.setNotifyEmail(body.getNotifyEmail());
        return ResponseEntity.ok(payslipAutoGenerateRepository.save(s));
    }

    @PostMapping("/payslip-auto-generate/trigger")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Manually trigger payslip auto-generation for all configured companies")
    public ResponseEntity<Map<String, String>> triggerAutoGenerate() {
        payrollScheduler.autoGeneratePayslips(true);
        return ResponseEntity.ok(Map.of("message", "Auto payslip generation triggered successfully"));
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

    // ─── Payslip Excel Export ──────────────────────────────────────────────────

    @GetMapping("/payslips/export/excel")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export payslips as Excel (Summary + Detailed sheets)",
               description = "Optional filters: status, startDate, endDate, employeeId")
    public ResponseEntity<byte[]> exportPayslipsExcel(
            @RequestParam(required = false) Payslip.PayslipStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long employeeId) {

        // Respect access scope (same pattern as listPayslips)
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        List<Payslip> payslips;
        if (scope == null || (scope.hasUnrestrictedAccess() && scope.getCompanyId() == null)) {
            payslips = payslipRepository.findAllWithAssociations();
        } else {
            List<Long> companyIds = scope.hasUnrestrictedAccess()
                    ? java.util.List.of(scope.getCompanyId())
                    : scope.getAccessibleCompanyIds();
            payslips = companyIds.isEmpty()
                    ? java.util.List.of()
                    : payslipRepository.findAllWithAssociationsByCompanyIdIn(companyIds);
        }

        // In-memory filtering
        payslips = payslips.stream()
                .filter(p -> status == null || status == p.getStatus())
                .filter(p -> employeeId == null || (p.getEmployee() != null && employeeId.equals(p.getEmployee().getId())))
                .filter(p -> startDate == null || (p.getStartDate() != null && !p.getStartDate().isBefore(startDate)))
                .filter(p -> endDate == null || (p.getEndDate() != null && !p.getEndDate().isAfter(endDate)))
                .toList();

        try {
            byte[] bytes = payslipExcelExportService.exportPayslips(payslips, startDate, endDate);
            String filename = "Payslip_export_" + LocalDate.now() + ".xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate payslip Excel export", e);
        }
    }

    // ─── Payslip PDF Download ──────────────────────────────────────────────────

    @GetMapping("/payslips/{id}/pdf")
    @PreAuthorize("hasAuthority('payroll:view') or hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    @Operation(summary = "Download a payslip as PDF")
    public ResponseEntity<byte[]> downloadPayslipPdf(@PathVariable Long id) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // ── Colours (indigo web theme) ─────────────────────────────────────
            Color INDIGO   = new Color(79,  70,  229);  // indigo-600
            Color INDIGO_D = new Color(55,  48,  163);  // indigo-800 (footer)
            Color INDIGO_L = new Color(238, 242, 255);  // indigo-50
            Color INDIGO_B = new Color(199, 210, 254);  // indigo-200 (border)
            Color GREEN_L  = new Color(220, 252, 231);  // green-100
            Color GREEN    = new Color(21,  128,  61);  // green-700
            Color GRAY_L   = new Color(243, 244, 246);  // gray-100
            Color GRAY     = new Color(55,   65,  81);  // gray-700
            Color GRAY_M   = new Color(107, 114, 128);  // gray-500
            Color WHITE    = Color.WHITE;
            Color BLACK    = new Color(17,  24,  39);   // gray-900

            // ── Fonts ──────────────────────────────────────────────────────────
            Font fTitle    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  20, INDIGO);
            Font fSubtitle = FontFactory.getFont(FontFactory.HELVETICA,       10, GRAY_M);
            Font fCardLbl  = FontFactory.getFont(FontFactory.HELVETICA,        8, GRAY_M);
            Font fCardVal  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  14, INDIGO);
            Font fSecHead  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  10, INDIGO);
            Font fFieldLbl = FontFactory.getFont(FontFactory.HELVETICA,        7, GRAY_M);
            Font fFieldVal = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9, BLACK);
            Font fRowLbl   = FontFactory.getFont(FontFactory.HELVETICA,        9, GRAY);
            Font fRowAmt   = FontFactory.getFont(FontFactory.HELVETICA,        9, BLACK);
            Font fTotalLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9, GREEN);
            Font fTotalAmt = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9, GREEN);
            Font fDedLbl   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9, GRAY);
            Font fDedAmt   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9, GRAY);
            Font fNetLbl   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  11, WHITE);
            Font fNetWords = FontFactory.getFont(FontFactory.HELVETICA,         8, new Color(199,210,254));
            Font fNetAmt   = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  18, WHITE);
            Font fCompany  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,  10, BLACK);

            // ── Parse payHeadData ──────────────────────────────────────────────
            java.util.Map<String, Object> phd = new java.util.HashMap<>();
            if (p.getPayHeadData() != null && !p.getPayHeadData().isBlank()) {
                try {
                    phd = new ObjectMapper().readValue(p.getPayHeadData(),
                            new TypeReference<java.util.Map<String, Object>>() {});
                } catch (Exception ignored) {}
            }

            double paidDays    = toDouble(phd.getOrDefault("paid_days", 0));
            double lossOfPay   = toDouble(phd.getOrDefault("loss_of_pay", 0));
            double bonus       = toDouble(phd.getOrDefault("bonus", 0));
            double overtime    = toDouble(phd.getOrDefault("overtime_pay", 0));
            double salAdv      = toDouble(phd.getOrDefault("salary_advance", 0));
            double loanRec     = toDouble(phd.getOrDefault("loan_recovery", 0));
            double salAdvDed   = toDouble(phd.getOrDefault("salary_advance_deduction", 0));

            // Additional named deductions from buckets
            double otherDed = toDouble(phd.getOrDefault("total_deductions", 0)) - lossOfPay - loanRec - salAdvDed;
            if (otherDed < 0) otherDed = 0;

            // ── Employee info ──────────────────────────────────────────────────
            var emp = p.getEmployee();
            String empName     = emp != null ? (emp.getFirstName() + " " + emp.getLastName()).trim() : "N/A";
            String badgeId     = emp != null && emp.getBadgeId() != null ? emp.getBadgeId() : "-";
            String dept        = emp != null && emp.getDepartment() != null ? emp.getDepartment().getName() : "-";
            String designation = emp != null && emp.getJobPosition() != null ? emp.getJobPosition().getName() : "-";
            String joining     = emp != null && emp.getDateJoining() != null
                    ? emp.getDateJoining().format(java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy")) : "-";
            String bankAcc     = "-";

            // ── Period label ──────────────────────────────────────────────────
            String periodLabel = "";
            if (p.getStartDate() != null) {
                periodLabel = p.getStartDate().format(java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy"));
            }

            // ── Company name ──────────────────────────────────────────────────
            String companyName = p.getCompany() != null && p.getCompany().getName() != null
                    ? p.getCompany().getName() : "";

            // ── Document setup ────────────────────────────────────────────────
            Document doc = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            float pageW = doc.right() - doc.left(); // usable width

            // ═══════════════════════════════════════════════════════════════
            // SECTION 1 — Header
            // ═══════════════════════════════════════════════════════════════
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new float[]{1f, 1f});
            header.setSpacingAfter(10f);

            // Left: Payslip title
            PdfPCell hLeft = new PdfPCell();
            hLeft.setBorder(Rectangle.NO_BORDER);
            hLeft.setPadding(0);
            Paragraph titleP = new Paragraph("Payslip", fTitle);
            titleP.setSpacingAfter(2f);
            hLeft.addElement(titleP);
            hLeft.addElement(new Paragraph(periodLabel, fSubtitle));
            header.addCell(hLeft);

            // Right: Company name
            PdfPCell hRight = new PdfPCell(new Phrase(companyName, fCompany));
            hRight.setBorder(Rectangle.NO_BORDER);
            hRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
            hRight.setVerticalAlignment(Element.ALIGN_BOTTOM);
            header.addCell(hRight);

            doc.add(header);

            // Horizontal rule
            PdfPTable rule = new PdfPTable(1);
            rule.setWidthPercentage(100);
            rule.setSpacingAfter(14f);
            PdfPCell rulCell = new PdfPCell(new Phrase(" "));
            rulCell.setBorder(Rectangle.BOTTOM);
            rulCell.setBorderColorBottom(INDIGO_B);
            rulCell.setBorderWidthBottom(1f);
            rulCell.setPaddingBottom(0f);
            rulCell.setFixedHeight(1f);
            rule.addCell(rulCell);
            doc.add(rule);

            // ═══════════════════════════════════════════════════════════════
            // SECTION 2 — Summary cards
            // ═══════════════════════════════════════════════════════════════
            PdfPTable cards = new PdfPTable(4);
            cards.setWidthPercentage(100);
            cards.setSpacingAfter(14f);

            String[][] cardData = {
                {"Net Salary",      formatAmount(p.getNetPay())},
                {"Gross Salary",    formatAmount(p.getGrossPay())},
                {"Total Deductions", formatAmount(p.getDeduction())},
                {"Paid Days",       String.format("%.2f", paidDays)},
            };
            for (String[] cd : cardData) {
                PdfPCell cell = new PdfPCell();
                cell.setBackgroundColor(INDIGO_L);
                cell.setBorderColor(INDIGO_B);
                cell.setBorderWidth(0.5f);
                cell.setPadding(10f);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                Paragraph lbl = new Paragraph(cd[0], fCardLbl);
                lbl.setAlignment(Element.ALIGN_CENTER);
                lbl.setSpacingAfter(4f);
                Paragraph val = new Paragraph(cd[1], fCardVal);
                val.setAlignment(Element.ALIGN_CENTER);
                cell.addElement(lbl);
                cell.addElement(val);
                cards.addCell(cell);
            }
            doc.add(cards);

            // ═══════════════════════════════════════════════════════════════
            // SECTION 3 — Employee Details
            // ═══════════════════════════════════════════════════════════════
            PdfPTable empBox = new PdfPTable(1);
            empBox.setWidthPercentage(100);
            empBox.setSpacingAfter(14f);

            // Header row
            PdfPCell empHeadCell = new PdfPCell(new Phrase("Employee Details", fSecHead));
            empHeadCell.setBackgroundColor(INDIGO_L);
            empHeadCell.setBorderColor(INDIGO_B);
            empHeadCell.setBorderWidth(0.5f);
            empHeadCell.setPadding(8f);
            empBox.addCell(empHeadCell);

            // 3-col fields row 1
            PdfPTable empRow1 = new PdfPTable(3);
            empRow1.setWidthPercentage(100);
            addEmpField(empRow1, "EMPLOYEE ID",   badgeId,   fFieldLbl, fFieldVal, INDIGO_B);
            addEmpField(empRow1, "EMPLOYEE NAME", empName,   fFieldLbl, fFieldVal, INDIGO_B);
            addEmpField(empRow1, "DEPARTMENT",    dept,      fFieldLbl, fFieldVal, INDIGO_B);

            PdfPCell row1Wrapper = new PdfPCell(empRow1);
            row1Wrapper.setPadding(0);
            row1Wrapper.setBorderColor(INDIGO_B);
            row1Wrapper.setBorderWidth(0.5f);
            row1Wrapper.setBorderWidthTop(0);
            empBox.addCell(row1Wrapper);

            // 3-col fields row 2
            PdfPTable empRow2 = new PdfPTable(3);
            empRow2.setWidthPercentage(100);
            addEmpField(empRow2, "DESIGNATION",        designation, fFieldLbl, fFieldVal, INDIGO_B);
            addEmpField(empRow2, "BANK ACC./CHEQUE NO.", bankAcc,   fFieldLbl, fFieldVal, INDIGO_B);
            addEmpField(empRow2, "DATE OF JOINING",    joining,     fFieldLbl, fFieldVal, INDIGO_B);

            PdfPCell row2Wrapper = new PdfPCell(empRow2);
            row2Wrapper.setPadding(0);
            row2Wrapper.setBorderColor(INDIGO_B);
            row2Wrapper.setBorderWidth(0.5f);
            row2Wrapper.setBorderWidthTop(0);
            empBox.addCell(row2Wrapper);

            doc.add(empBox);

            // ═══════════════════════════════════════════════════════════════
            // SECTION 4 — Allowances & Deductions (two columns)
            // ═══════════════════════════════════════════════════════════════
            PdfPTable twoCol = new PdfPTable(2);
            twoCol.setWidthPercentage(100);
            twoCol.setSpacingAfter(14f);
            twoCol.setWidths(new float[]{1f, 1f});

            // ── LEFT: Allowances ──────────────────────────────────────────
            PdfPTable allowTable = new PdfPTable(2);
            allowTable.setWidthPercentage(100);
            allowTable.setWidths(new float[]{3f, 1.5f});

            // Section header
            PdfPCell aHead = new PdfPCell(new Phrase("Allowances", fSecHead));
            aHead.setColspan(2);
            aHead.setBackgroundColor(INDIGO_L);
            aHead.setBorderColor(INDIGO_B);
            aHead.setBorderWidth(0.5f);
            aHead.setPadding(8f);
            allowTable.addCell(aHead);

            // Allowance rows
            addLineRow(allowTable, "Basic Pay",          formatAmount(p.getBasicPay()),           fRowLbl, fRowAmt, INDIGO_B, WHITE);
            addLineRow(allowTable, "Housing Allowance",  formatAmount(p.getHousingAllowance()),   fRowLbl, fRowAmt, INDIGO_B, WHITE);
            addLineRow(allowTable, "Transport Allowance",formatAmount(p.getTransportAllowance()), fRowLbl, fRowAmt, INDIGO_B, WHITE);
            addLineRow(allowTable, "Other Allowance",    formatAmount(p.getOtherAllowance()),     fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (bonus > 0)    addLineRow(allowTable, "Bonus",          formatAmt(bonus),   fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (overtime > 0) addLineRow(allowTable, "Overtime",       formatAmt(overtime),fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (salAdv > 0)   addLineRow(allowTable, "Salary Advance", formatAmt(salAdv),  fRowLbl, fRowAmt, INDIGO_B, WHITE);

            // Total Gross Pay footer
            addLineRow(allowTable, "Total Gross Pay", formatAmount(p.getGrossPay()), fTotalLbl, fTotalAmt, INDIGO_B, GREEN_L);

            PdfPCell leftCell = new PdfPCell(allowTable);
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setPadding(0);
            twoCol.addCell(leftCell);

            // ── RIGHT: Deductions ─────────────────────────────────────────
            PdfPTable dedTable = new PdfPTable(2);
            dedTable.setWidthPercentage(100);
            dedTable.setWidths(new float[]{3f, 1.5f});

            PdfPCell dHead = new PdfPCell(new Phrase("Deductions", fSecHead));
            dHead.setColspan(2);
            dHead.setBackgroundColor(INDIGO_L);
            dHead.setBorderColor(INDIGO_B);
            dHead.setBorderWidth(0.5f);
            dHead.setPadding(8f);
            dedTable.addCell(dHead);

            if (lossOfPay > 0)  addLineRow(dedTable, "Loss of Pay",                 formatAmt(lossOfPay),  fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (loanRec + salAdvDed > 0) addLineRow(dedTable, "Salary Advance / Loan Recovery", formatAmt(loanRec + salAdvDed), fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (otherDed > 0)   addLineRow(dedTable, "Deduction",                   formatAmt(otherDed),   fRowLbl, fRowAmt, INDIGO_B, WHITE);
            if (lossOfPay == 0 && loanRec + salAdvDed == 0 && otherDed == 0) {
                // at least show total deduction if no breakdown
                addLineRow(dedTable, "Deduction", formatAmount(p.getDeduction()), fRowLbl, fRowAmt, INDIGO_B, WHITE);
            }

            addLineRow(dedTable, "Total Deductions", formatAmount(p.getDeduction()), fDedLbl, fDedAmt, INDIGO_B, GRAY_L);

            PdfPCell rightCell = new PdfPCell(dedTable);
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setPadding(0);
            twoCol.addCell(rightCell);

            doc.add(twoCol);

            // ═══════════════════════════════════════════════════════════════
            // SECTION 5 — Total Net Payable footer bar
            // ═══════════════════════════════════════════════════════════════
            PdfPTable footer = new PdfPTable(2);
            footer.setWidthPercentage(100);
            footer.setWidths(new float[]{1.8f, 1f});

            // Left: label + words
            PdfPCell fLeft = new PdfPCell();
            fLeft.setBackgroundColor(INDIGO_D);
            fLeft.setBorder(Rectangle.NO_BORDER);
            fLeft.setPadding(14f);
            Paragraph netLbl = new Paragraph("Total Net Payable", fNetLbl);
            netLbl.setSpacingAfter(3f);
            fLeft.addElement(netLbl);
            fLeft.addElement(new Paragraph(numberToWords(p.getNetPay()), fNetWords));
            footer.addCell(fLeft);

            // Right: big amount
            PdfPCell fRight = new PdfPCell(new Phrase(formatAmount(p.getNetPay()), fNetAmt));
            fRight.setBackgroundColor(INDIGO_D);
            fRight.setBorder(Rectangle.NO_BORDER);
            fRight.setPadding(14f);
            fRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
            fRight.setVerticalAlignment(Element.ALIGN_MIDDLE);
            footer.addCell(fRight);

            doc.add(footer);
            doc.close();

            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_PDF);
            httpHeaders.setContentDispositionFormData("inline", "payslip-" + id + ".pdf");
            return ResponseEntity.ok().headers(httpHeaders).body(baos.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate payslip PDF", e);
        }
    }

    /** Add an employee detail field (label above value) to a 3-col table */
    private void addEmpField(PdfPTable t, String label, String value, Font lblFont, Font valFont, Color border) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(border);
        c.setBorderWidth(0.5f);
        c.setPadding(8f);
        Paragraph lp = new Paragraph(label, lblFont);
        lp.setSpacingAfter(2f);
        c.addElement(lp);
        c.addElement(new Paragraph(value, valFont));
        t.addCell(c);
    }

    /** Add a two-column label/amount row to an allowance or deduction table */
    private void addLineRow(PdfPTable t, String label, String amount, Font lblFont, Font amtFont, Color border, Color bg) {
        PdfPCell lc = new PdfPCell(new Phrase(label, lblFont));
        lc.setBackgroundColor(bg);
        lc.setBorderColor(border);
        lc.setBorderWidth(0.5f);
        lc.setPaddingTop(6f);
        lc.setPaddingBottom(6f);
        lc.setPaddingLeft(8f);
        lc.setPaddingRight(4f);
        t.addCell(lc);

        PdfPCell ac = new PdfPCell(new Phrase(amount, amtFont));
        ac.setBackgroundColor(bg);
        ac.setBorderColor(border);
        ac.setBorderWidth(0.5f);
        ac.setPaddingTop(6f);
        ac.setPaddingBottom(6f);
        ac.setPaddingLeft(4f);
        ac.setPaddingRight(8f);
        ac.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(ac);
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    private String formatAmt(double v) {
        return String.format("%.2f", v);
    }

    private String formatAmount(java.math.BigDecimal amount) {
        return amount != null ? amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() : "0.00";
    }

    /** Converts a BigDecimal amount to English words (e.g. "AED One Thousand Two Hundred ... Fils Only") */
    private String numberToWords(java.math.BigDecimal amount) {
        if (amount == null) return "";
        long intPart  = amount.longValue();
        int  fracPart = amount.remainder(java.math.BigDecimal.ONE)
                .abs().multiply(java.math.BigDecimal.valueOf(100))
                .setScale(0, java.math.RoundingMode.HALF_UP).intValue();
        String words = integerToWords(intPart);
        if (fracPart > 0) {
            return words + " . " + integerToWords(fracPart) + " Fils Only";
        }
        return words + " Only";
    }

    private static final String[] ONES  = {"","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
            "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"};
    private static final String[] TENS  = {"","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"};

    private String integerToWords(long n) {
        if (n == 0) return "Zero";
        if (n < 0)  return "Minus " + integerToWords(-n);
        String result = "";
        if (n >= 1_000_000) { result += integerToWords(n / 1_000_000) + " Million "; n %= 1_000_000; }
        if (n >= 1_000)     { result += integerToWords(n / 1_000)     + " Thousand "; n %= 1_000; }
        if (n >= 100)       { result += ONES[(int)(n / 100)]          + " Hundred "; n %= 100; }
        if (n >= 20)        { result += TENS[(int)(n / 10)]; if (n % 10 != 0) result += " " + ONES[(int)(n % 10)]; }
        else if (n > 0)     { result += ONES[(int)n]; }
        return result.trim();
    }

    /**
     * Derives contract status from dates when not explicitly provided.
     * - endDate in the past → EXPIRED
     * - startDate on or before today (and not expired) → ACTIVE
     * - otherwise → DRAFT (future or undated contract)
     */
    private Contract.ContractStatus resolveContractStatus(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        java.time.LocalDate today = java.time.LocalDate.now();
        if (endDate != null && endDate.isBefore(today)) {
            return Contract.ContractStatus.EXPIRED;
        }
        if (startDate != null && !startDate.isAfter(today)) {
            return Contract.ContractStatus.ACTIVE;
        }
        return Contract.ContractStatus.DRAFT;
    }

    // ─── Send Payslip Email ────────────────────────────────────────────────────

    @PostMapping("/payslips/{id}/send-email")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "Send payslip email to employee")
    public ResponseEntity<Map<String, String>> sendPayslipEmail(@PathVariable Long id) {
        payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));
        payrollService.sendPayslipEmail(id);
        return ResponseEntity.ok(Map.of("message", "Payslip email sent successfully"));
    }

    // ─── Delete Loan ──────────────────────────────────────────────────────────

    @DeleteMapping("/loans/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a loan account")
    public ResponseEntity<Void> deleteLoan(@PathVariable Long id) {
        loanAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", id));
        loanAccountRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Batch Groups ─────────────────────────────────────────────────────────

    @GetMapping("/batch-groups")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List payroll batch groups (company-scoped)")
    public ResponseEntity<List<PayrollBatchGroup>> listBatchGroups() {
        var spec = ScopeFilter.<PayrollBatchGroup>byCompany();
        return ResponseEntity.ok(spec != null
                ? payrollBatchGroupRepository.findAll(spec)
                : payrollBatchGroupRepository.findAll());
    }

    @PostMapping("/batch-groups")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a payroll batch group")
    public ResponseEntity<PayrollBatchGroup> createBatchGroup(@RequestBody PayrollBatchGroup batchGroup) {
        if (batchGroup.getCompany() != null && batchGroup.getCompany().getId() != null) {
            batchGroup.setCompany(companyRepository.getReferenceById(batchGroup.getCompany().getId()));
        }
        return ResponseEntity.ok(payrollBatchGroupRepository.save(batchGroup));
    }

    @PutMapping("/batch-groups/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a payroll batch group")
    public ResponseEntity<PayrollBatchGroup> updateBatchGroup(@PathVariable Long id,
                                                               @RequestBody PayrollBatchGroup updated) {
        PayrollBatchGroup group = payrollBatchGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PayrollBatchGroup", id));
        group.setName(updated.getName());
        group.setDescription(updated.getDescription());
        group.setStartDate(updated.getStartDate());
        group.setEndDate(updated.getEndDate());
        return ResponseEntity.ok(payrollBatchGroupRepository.save(group));
    }

    @DeleteMapping("/batch-groups/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a payroll batch group")
    public ResponseEntity<Void> deleteBatchGroup(@PathVariable Long id) {
        PayrollBatchGroup group = payrollBatchGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PayrollBatchGroup", id));
        group.setActive(false);
        payrollBatchGroupRepository.save(group);
        return ResponseEntity.noContent().build();
    }

    // ─── Payroll Dashboard ────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get payroll dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> payrollDashboard(@RequestParam Long companyId) {
        List<Payslip> all = payslipRepository.findByCompanyId(companyId);
        long total = all.size();
        long confirmed = all.stream().filter(p -> Payslip.PayslipStatus.CONFIRMED == p.getStatus()).count();
        long paid = all.stream().filter(p -> Payslip.PayslipStatus.PAID == p.getStatus()).count();
        long pending = all.stream().filter(p -> Payslip.PayslipStatus.DRAFT == p.getStatus()).count();
        java.math.BigDecimal totalNetPay = all.stream()
                .filter(p -> p.getNetPay() != null)
                .map(Payslip::getNetPay)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        Map<String, Object> result = new HashMap<>();
        result.put("totalPayslips", total);
        result.put("confirmedPayslips", confirmed);
        result.put("paidPayslips", paid);
        result.put("pendingPayslips", pending);
        result.put("totalNetPay", totalNetPay);
        return ResponseEntity.ok(result);
    }

    // ─── Payslip Inline Edit ──────────────────────────────────────────────────

    @PatchMapping("/payslips/{id}/inline")
    @PreAuthorize("hasAuthority('payroll:edit')")
    @Transactional
    @Operation(summary = "Inline-edit specific fields on a payslip")
    public ResponseEntity<Payslip> inlineEditPayslip(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> fields) {
        Payslip p = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", id));

        fields.forEach((key, value) -> {
            switch (key) {
                case "groupName" -> p.setGroupName(value != null ? value.toString() : null);
                case "reference" -> p.setReference(value != null ? value.toString() : null);
                case "status" -> {
                    if (value != null) p.setStatus(Payslip.PayslipStatus.valueOf(value.toString()));
                }
                case "basicPay" -> {
                    if (value != null) p.setBasicPay(new java.math.BigDecimal(value.toString()));
                }
                case "grossPay" -> {
                    if (value != null) p.setGrossPay(new java.math.BigDecimal(value.toString()));
                }
                case "deduction" -> {
                    if (value != null) p.setDeduction(new java.math.BigDecimal(value.toString()));
                }
                case "netPay" -> {
                    if (value != null) p.setNetPay(new java.math.BigDecimal(value.toString()));
                }
                default -> { /* ignore unknown fields */ }
            }
        });

        payslipRepository.save(p);
        return ResponseEntity.ok(payslipRepository.findByIdWithAssociations(id).orElse(p));
    }

    // ─── Payslip Import ────────────────────────────────────────────────────────

    @GetMapping("/payslips/import/info")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get import info: month grid with payslip counts per month for a given year")
    public ResponseEntity<Map<String, Object>> payslipImportInfo(
            @RequestParam Long companyId,
            @RequestParam(defaultValue = "0") int year) {
        if (year == 0) year = LocalDate.now().getYear();
        List<Map<String, Object>> monthsData = payslipImportService.getImportInfo(companyId, year);
        long employeeCount = employeeRepository.countByCompanyIdAndIsActiveTrue(companyId);
        Map<String, Object> result = new HashMap<>();
        result.put("current_year",     year);
        result.put("current_month",    LocalDate.now().getMonthValue());
        result.put("months_data",      monthsData);
        result.put("employee_count",   employeeCount);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/payslips/import/template")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Download payslip import template (pre-filled with formulas)")
    public ResponseEntity<byte[]> downloadImportTemplate(
            @RequestParam Long companyId,
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year) {
        if (month == 0) month = LocalDate.now().getMonthValue();
        if (year  == 0) year  = LocalDate.now().getYear();

        java.util.List<com.example.demo.employee.entity.Employee> employees =
                employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);

        try {
            byte[] bytes = payslipExcelExportService.exportImportTemplate(employees, month, year);
            String filename = "payslip_import_template_" + companyId + "_" + year + "_" + month + ".xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate import template", e);
        }
    }

    @PostMapping(value = "/payslips/import/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Process payslip import from uploaded Excel/CSV file")
    public ResponseEntity<Map<String, Object>> processPayslipImport(
            @RequestParam Long companyId,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = payslipImportService.processImport(companyId, month, year, file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("status", "error", "message", "Import failed: " + e.getMessage(), "imported", 0));
        }
    }

    // ─── Import Template Export (re-importable format) ─────────────────────────

    @GetMapping("/payslips/export/import-format")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export payslips in re-importable Excel format (green/orange columns with formulas)")
    public ResponseEntity<byte[]> exportPayslipsImportFormat(
            @RequestParam Long companyId,
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year) {
        if (month == 0) month = LocalDate.now().getMonthValue();
        if (year  == 0) year  = LocalDate.now().getYear();

        java.util.List<com.example.demo.employee.entity.Employee> employees =
                employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);

        try {
            byte[] bytes = payslipExcelExportService.exportImportTemplate(employees, month, year);
            String filename = "payslips_import_format_" + companyId + "_" + year + "_" + month + ".xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok().headers(headers).body(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate import format export", e);
        }
    }
}
