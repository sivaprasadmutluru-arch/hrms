package com.example.demo.payroll.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.event.PayslipGeneratedEvent;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.*;
import com.example.demo.payroll.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final AllowanceRepository allowanceRepository;
    private final DeductionRepository deductionRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final TaxBracketRepository taxBracketRepository;
    private final FilingStatusRepository filingStatusRepository;
    private final PayslipRepository payslipRepository;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Generate a payslip for one employee for the given pay period.
     * Formula: netPay = basicPay + totalAllowances - preTaxDeductions - tax - postTaxDeductions - loanInstallments + approvedReimbursements
     */
    @Transactional
    public Payslip generatePayslip(Long employeeId, LocalDate startDate, LocalDate endDate, Long companyId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        // Check for existing draft payslip to avoid duplicates
        List<Payslip> existing = payslipRepository.findByEmployeeIdAndStartDateBetween(employeeId, startDate, startDate);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        // ── 1. Basic Pay from active contract ───────────────────────────────
        Contract contract = contractRepository
                .findByEmployeeIdAndContractStatus(employeeId, Contract.ContractStatus.ACTIVE)
                .orElse(null);
        BigDecimal basicPay = contract != null && contract.getWage() != null
                ? contract.getWage() : BigDecimal.ZERO;

        // ── 2. Allowances ────────────────────────────────────────────────────
        List<Allowance> allowances = allowanceRepository.findByCompanyId(companyId);
        BigDecimal totalAllowance = BigDecimal.ZERO;
        List<Map<String, Object>> allowanceLines = new ArrayList<>();

        for (Allowance a : allowances) {
            BigDecimal amount;
            if (!Boolean.TRUE.equals(a.getIsFixed()) && a.getRate() != null) {
                amount = basicPay.multiply(BigDecimal.valueOf(a.getRate() / 100.0))
                        .setScale(2, RoundingMode.HALF_UP);
            } else {
                amount = a.getAmount() != null ? BigDecimal.valueOf(a.getAmount()) : BigDecimal.ZERO;
            }
            totalAllowance = totalAllowance.add(amount);
            allowanceLines.add(Map.of("name", a.getTitle(), "amount", amount, "type", "ALLOWANCE"));
        }

        // ── 2b. Contract-level allowances (housing / transport / other) ──────
        if (contract != null) {
            if (contract.getHousingAllowance() != null && contract.getHousingAllowance().compareTo(BigDecimal.ZERO) > 0) {
                totalAllowance = totalAllowance.add(contract.getHousingAllowance());
                allowanceLines.add(Map.of("name", "Housing Allowance", "amount", contract.getHousingAllowance(), "type", "ALLOWANCE"));
            }
            if (contract.getTransportAllowance() != null && contract.getTransportAllowance().compareTo(BigDecimal.ZERO) > 0) {
                totalAllowance = totalAllowance.add(contract.getTransportAllowance());
                allowanceLines.add(Map.of("name", "Transport Allowance", "amount", contract.getTransportAllowance(), "type", "ALLOWANCE"));
            }
            if (contract.getOtherAllowance() != null && contract.getOtherAllowance().compareTo(BigDecimal.ZERO) > 0) {
                totalAllowance = totalAllowance.add(contract.getOtherAllowance());
                allowanceLines.add(Map.of("name", "Other Allowance", "amount", contract.getOtherAllowance(), "type", "ALLOWANCE"));
            }
        }

        BigDecimal grossPay = basicPay.add(totalAllowance);

        // ── 3. Pre-tax deductions ────────────────────────────────────────────
        List<Deduction> deductions = deductionRepository.findByCompanyId(companyId);
        BigDecimal preTaxDeductions = BigDecimal.ZERO;
        BigDecimal postTaxDeductions = BigDecimal.ZERO;
        List<Map<String, Object>> deductionLines = new ArrayList<>();

        for (Deduction d : deductions) {
            BigDecimal amount;
            if (!Boolean.TRUE.equals(d.getIsFixed())) {
                double rate = d.getRate() != null ? d.getRate() : 0.0;
                amount = grossPay.multiply(BigDecimal.valueOf(rate / 100.0))
                        .setScale(2, RoundingMode.HALF_UP);
            } else {
                amount = d.getAmount() != null ? BigDecimal.valueOf(d.getAmount()) : BigDecimal.ZERO;
            }

            if (Boolean.TRUE.equals(d.getIsPretax())) {
                preTaxDeductions = preTaxDeductions.add(amount);
            } else {
                postTaxDeductions = postTaxDeductions.add(amount);
            }
            deductionLines.add(Map.of("name", d.getTitle(), "amount", amount, "type", "DEDUCTION",
                    "pretax", Boolean.TRUE.equals(d.getIsPretax())));
        }

        // ── 4. Tax ────────────────────────────────────────────────────────────
        BigDecimal taxableIncome = grossPay.subtract(preTaxDeductions);
        Long contractFilingStatusId = (contract != null && contract.getFilingStatus() != null)
                ? contract.getFilingStatus().getId() : null;
        BigDecimal taxAmount = calculateTax(taxableIncome, companyId, contractFilingStatusId);

        // ── 5. Loan installments ──────────────────────────────────────────────
        List<LoanAccount> activeLoans = loanAccountRepository.findByEmployeeIdAndSettledFalse(employeeId);
        BigDecimal totalLoanDeduction = BigDecimal.ZERO;
        for (LoanAccount loan : activeLoans) {
            if (loan.getInstallmentAmount() != null
                    && loan.getInstallmentStartDate() != null
                    && !loan.getInstallmentStartDate().isAfter(endDate)) {
                totalLoanDeduction = totalLoanDeduction.add(loan.getInstallmentAmount());
                deductionLines.add(Map.of("name", loan.getTitle(), "amount", loan.getInstallmentAmount(),
                        "type", "LOAN"));
            }
        }

        // ── 6. Approved reimbursements in period ──────────────────────────────
        List<Reimbursement> reimbursements = reimbursementRepository
                .findByEmployeeIdAndStatusAndAllowanceOnBetween(
                        employeeId, Reimbursement.ReimbursementStatus.APPROVED, startDate, endDate);
        BigDecimal totalReimbursement = reimbursements.stream()
                .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        for (Reimbursement r : reimbursements) {
            if (r.getAmount() != null) {
                allowanceLines.add(Map.of("name", r.getTitle(), "amount", r.getAmount(), "type", "REIMBURSEMENT"));
            }
        }

        // ── 7. Net pay ────────────────────────────────────────────────────────
        BigDecimal netPay = grossPay
                .subtract(preTaxDeductions)
                .subtract(taxAmount)
                .subtract(postTaxDeductions)
                .subtract(totalLoanDeduction)
                .add(totalReimbursement)
                .setScale(2, RoundingMode.HALF_UP);

        // ── 8. Build pay head data JSON ───────────────────────────────────────
        Map<String, Object> payHeadData = new LinkedHashMap<>();
        payHeadData.put("basicPay", basicPay);
        payHeadData.put("allowances", allowanceLines);
        payHeadData.put("deductions", deductionLines);
        payHeadData.put("taxAmount", taxAmount);
        payHeadData.put("loanDeductions", totalLoanDeduction);
        payHeadData.put("reimbursements", totalReimbursement);

        // ── 9. Persist payslip ────────────────────────────────────────────────
        Payslip payslip = new Payslip();
        payslip.setEmployee(employee);
        payslip.setStartDate(startDate);
        payslip.setEndDate(endDate);
        payslip.setPayDate(endDate);
        payslip.setBasicPay(basicPay);
        payslip.setGrossPay(grossPay);
        payslip.setDeduction(preTaxDeductions.add(taxAmount).add(postTaxDeductions).add(totalLoanDeduction));
        payslip.setNetPay(netPay);
        payslip.setStatus(Payslip.PayslipStatus.DRAFT);
        payslip.setCompany(companyRepository.getReferenceById(companyId));
        try {
            payslip.setPayHeadData(objectMapper.writeValueAsString(payHeadData));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize pay head data", e);
        }

        Payslip savedPayslip = payslipRepository.save(payslip);
        eventPublisher.publishEvent(new PayslipGeneratedEvent(this, savedPayslip));
        return savedPayslip;
    }

    /**
     * Bulk-generate payslips for all active employees in a company.
     */
    @Transactional
    public List<Payslip> generateBulkPayslips(Long companyId, LocalDate startDate, LocalDate endDate) {
        List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        List<Payslip> results = new ArrayList<>();
        for (Employee emp : employees) {
            try {
                results.add(generatePayslip(emp.getId(), startDate, endDate, companyId));
            } catch (Exception e) {
                log.warn("Failed to generate payslip for employee {}: {}", emp.getId(), e.getMessage());
            }
        }
        return results;
    }

    /**
     * Calculate income tax by looking up tax brackets for the company's default filing status.
     * Uses progressive bracket calculation.
     */
    private BigDecimal calculateTax(BigDecimal taxableIncome, Long companyId, Long contractFilingStatusId) {
        // Use contract's filing status if set, otherwise fall back to first company filing status
        Long filingStatusId = contractFilingStatusId;
        if (filingStatusId == null) {
            List<FilingStatus> filingStatuses = filingStatusRepository.findByCompanyId(companyId);
            if (filingStatuses.isEmpty()) return BigDecimal.ZERO;
            filingStatusId = filingStatuses.get(0).getId();
        }

        List<TaxBracket> brackets = taxBracketRepository.findByFilingStatusId(filingStatusId);
        if (brackets.isEmpty()) return BigDecimal.ZERO;

        brackets.sort(Comparator.comparingDouble(TaxBracket::getMinIncome));

        BigDecimal tax = BigDecimal.ZERO;
        double income = taxableIncome.doubleValue();

        for (TaxBracket bracket : brackets) {
            double bracketMin = bracket.getMinIncome();
            double bracketMax = bracket.getMaxIncome() != null ? bracket.getMaxIncome() : Double.MAX_VALUE;

            if (income <= bracketMin) break;

            double taxableInBracket = Math.min(income, bracketMax) - bracketMin;
            double bracketTax = taxableInBracket * (bracket.getTaxRate() / 100.0);
            tax = tax.add(BigDecimal.valueOf(bracketTax));
        }

        return tax.setScale(2, RoundingMode.HALF_UP);
    }
}
