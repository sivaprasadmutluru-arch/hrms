package com.example.demo.payroll.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.Contract;
import com.example.demo.payroll.entity.GratuityCalculation;
import com.example.demo.payroll.repository.ContractRepository;
import com.example.demo.payroll.repository.GratuityCalculationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GratuityService {

    private static final BigDecimal DAYS_PER_MONTH = new BigDecimal("12");
    private static final BigDecimal DAYS_PER_YEAR  = new BigDecimal("365");
    private static final BigDecimal DAILY_DIVISOR  = new BigDecimal("30");
    private static final BigDecimal DAYS_21         = new BigDecimal("21");
    private static final BigDecimal DAYS_30         = new BigDecimal("30");
    private static final BigDecimal FIVE_YEARS_GRATUITY = new BigDecimal("105"); // 5 * 21

    private final GratuityCalculationRepository gratuityRepo;
    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final CompanyRepository companyRepository;

    // ─── Calculate & persist ──────────────────────────────────────────────────

    @Transactional
    public GratuityCalculation calculate(Map<String, Object> request) {
        Long employeeId = toLong(request.get("employeeId"));
        String lastWorkingDateStr = (String) request.get("lastWorkingDate");
        LocalDate lastWorkingDate = LocalDate.parse(lastWorkingDateStr);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        // Fetch the contract for joining date & basic salary: prefer ACTIVE, otherwise the
        // most recent contract of any status (deterministic, unlike an unordered findFirst).
        Contract contract = contractRepository
                .findBestContractForPayroll(employeeId)
                .orElse(null);

        LocalDate joiningDate;
        BigDecimal basicSalary;

        if (request.containsKey("joiningDate") && request.get("joiningDate") != null) {
            joiningDate = LocalDate.parse((String) request.get("joiningDate"));
        } else if (contract != null && contract.getStartDate() != null) {
            joiningDate = contract.getStartDate();
        } else {
            throw new IllegalArgumentException("Joining date not provided and no active contract found");
        }

        if (request.containsKey("basicSalary") && request.get("basicSalary") != null) {
            basicSalary = new BigDecimal(request.get("basicSalary").toString());
        } else if (contract != null && contract.getWage() != null) {
            basicSalary = contract.getWage();
        } else {
            throw new IllegalArgumentException("Basic salary not provided and no active contract found");
        }

        GratuityCalculation.ContractType contractType = GratuityCalculation.ContractType.UNLIMITED;
        if (request.containsKey("contractType") && request.get("contractType") != null) {
            contractType = GratuityCalculation.ContractType.valueOf((String) request.get("contractType"));
        }

        // Service period
        Period period = Period.between(joiningDate, lastWorkingDate);
        int years = period.getYears();
        int months = period.getMonths();
        int days = period.getDays();

        // Daily basic salary
        BigDecimal dailyBasicSalary = basicSalary.divide(DAILY_DIVISOR, 4, RoundingMode.HALF_UP);

        // Gratuity days (UAE law)
        BigDecimal gratuityDays = computeGratuityDays(years, months, days);

        // Gratuity amount
        BigDecimal gratuityAmount = gratuityDays.multiply(dailyBasicSalary).setScale(2, RoundingMode.HALF_UP);

        // Cap: cannot exceed 2 years' total salary (24 months of basic)
        BigDecimal maxGratuity = basicSalary.multiply(new BigDecimal("24")).setScale(2, RoundingMode.HALF_UP);
        if (gratuityAmount.compareTo(maxGratuity) > 0) {
            gratuityAmount = maxGratuity;
        }

        // Additional settlement items
        BigDecimal leaveEncashmentDays = toBigDecimal(request.getOrDefault("leaveEncashmentDays", BigDecimal.ZERO));
        BigDecimal leaveEncashmentAmount = leaveEncashmentDays.multiply(dailyBasicSalary).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pendingSalary = toBigDecimal(request.getOrDefault("pendingSalary", BigDecimal.ZERO));
        BigDecimal airTicketAllowance = toBigDecimal(request.getOrDefault("airTicketAllowance", BigDecimal.ZERO));

        // Deductions
        BigDecimal loanDeduction = toBigDecimal(request.getOrDefault("loanDeduction", BigDecimal.ZERO));
        BigDecimal noticePeriodDeduction = toBigDecimal(request.getOrDefault("noticePeriodDeduction", BigDecimal.ZERO));
        BigDecimal otherDeductions = toBigDecimal(request.getOrDefault("otherDeductions", BigDecimal.ZERO));

        // Final settlement
        BigDecimal finalSettlement = gratuityAmount
                .add(leaveEncashmentAmount)
                .add(pendingSalary)
                .add(airTicketAllowance)
                .subtract(loanDeduction)
                .subtract(noticePeriodDeduction)
                .subtract(otherDeductions)
                .setScale(2, RoundingMode.HALF_UP);

        // Company
        Long companyId = toLong(request.get("companyId"));
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + companyId));

        GratuityCalculation calc = new GratuityCalculation();
        calc.setEmployee(employee);
        calc.setCompany(company);
        calc.setJoiningDate(joiningDate);
        calc.setLastWorkingDate(lastWorkingDate);
        calc.setContractType(contractType);
        calc.setCompletedYears(years);
        calc.setCompletedMonths(months);
        calc.setCompletedDays(days);
        calc.setBasicSalary(basicSalary);
        calc.setDailyBasicSalary(dailyBasicSalary);
        calc.setGratuityDays(gratuityDays.setScale(4, RoundingMode.HALF_UP));
        calc.setGratuityAmount(gratuityAmount);
        calc.setLeaveEncashmentDays(leaveEncashmentDays);
        calc.setLeaveEncashmentAmount(leaveEncashmentAmount);
        calc.setPendingSalary(pendingSalary);
        calc.setAirTicketAllowance(airTicketAllowance);
        calc.setLoanDeduction(loanDeduction);
        calc.setNoticePeriodDeduction(noticePeriodDeduction);
        calc.setOtherDeductions(otherDeductions);
        calc.setFinalSettlementAmount(finalSettlement);
        calc.setNotes(request.containsKey("notes") ? (String) request.get("notes") : null);
        calc.setStatus(GratuityCalculation.GratuityStatus.DRAFT);

        return gratuityRepo.save(calc);
    }

    // ─── UAE Gratuity Days Formula ─────────────────────────────────────────────

    /**
     * Returns total gratuity-eligible days per UAE Labour Law.
     * - Service < 1 year: 0 days
     * - 1 – 5 years: 21 days/year (pro-rata for months & days)
     * - > 5 years: first 5 yrs = 105 days, remainder at 30 days/year (pro-rata)
     */
    private BigDecimal computeGratuityDays(int years, int months, int days) {
        // Less than 1 year — not eligible
        if (years < 1) return BigDecimal.ZERO;

        BigDecimal bd = new BigDecimal(days);
        BigDecimal bm = new BigDecimal(months);
        BigDecimal by = new BigDecimal(years);

        if (years <= 5) {
            // 21 days per year, pro-rata for months and days
            BigDecimal fromYears  = by.multiply(DAYS_21);
            BigDecimal fromMonths = bm.multiply(DAYS_21).divide(DAYS_PER_MONTH, 4, RoundingMode.HALF_UP);
            BigDecimal fromDays   = bd.multiply(DAYS_21).divide(DAYS_PER_YEAR, 4, RoundingMode.HALF_UP);
            return fromYears.add(fromMonths).add(fromDays);
        } else {
            // First 5 years = 105 days (5 * 21)
            BigDecimal remaining = by.subtract(new BigDecimal("5"));
            BigDecimal fromRemYears  = remaining.multiply(DAYS_30);
            BigDecimal fromRemMonths = bm.multiply(DAYS_30).divide(DAYS_PER_MONTH, 4, RoundingMode.HALF_UP);
            BigDecimal fromRemDays   = bd.multiply(DAYS_30).divide(DAYS_PER_YEAR, 4, RoundingMode.HALF_UP);
            return FIVE_YEARS_GRATUITY.add(fromRemYears).add(fromRemMonths).add(fromRemDays);
        }
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GratuityCalculation> listForCurrentScope() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || scope.hasUnrestrictedAccess()) {
            return gratuityRepo.findAllWithDetails();
        }
        List<Long> companyIds = scope.hasUnrestrictedAccess()
                ? java.util.List.of(scope.getCompanyId())
                : scope.getAccessibleCompanyIds();
        if (companyIds.isEmpty()) return java.util.List.of();
        return gratuityRepo.findAllByCompanyIdInWithDetails(companyIds);
    }

    @Transactional(readOnly = true)
    public GratuityCalculation getById(Long id) {
        return gratuityRepo.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gratuity record not found: " + id));
    }

    @Transactional
    public GratuityCalculation update(Long id, Map<String, Object> request) {
        GratuityCalculation calc = gratuityRepo.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gratuity record not found: " + id));

        if (request.containsKey("leaveEncashmentDays"))
            calc.setLeaveEncashmentDays(toBigDecimal(request.get("leaveEncashmentDays")));
        if (request.containsKey("leaveEncashmentAmount"))
            calc.setLeaveEncashmentAmount(toBigDecimal(request.get("leaveEncashmentAmount")));
        if (request.containsKey("pendingSalary"))
            calc.setPendingSalary(toBigDecimal(request.get("pendingSalary")));
        if (request.containsKey("airTicketAllowance"))
            calc.setAirTicketAllowance(toBigDecimal(request.get("airTicketAllowance")));
        if (request.containsKey("loanDeduction"))
            calc.setLoanDeduction(toBigDecimal(request.get("loanDeduction")));
        if (request.containsKey("noticePeriodDeduction"))
            calc.setNoticePeriodDeduction(toBigDecimal(request.get("noticePeriodDeduction")));
        if (request.containsKey("otherDeductions"))
            calc.setOtherDeductions(toBigDecimal(request.get("otherDeductions")));
        if (request.containsKey("gratuityAmount"))
            calc.setGratuityAmount(toBigDecimal(request.get("gratuityAmount")));
        if (request.containsKey("notes"))
            calc.setNotes((String) request.get("notes"));

        // Recalculate final settlement
        BigDecimal finalSettlement = calc.getGratuityAmount()
                .add(calc.getLeaveEncashmentAmount())
                .add(calc.getPendingSalary())
                .add(calc.getAirTicketAllowance())
                .subtract(calc.getLoanDeduction())
                .subtract(calc.getNoticePeriodDeduction())
                .subtract(calc.getOtherDeductions())
                .setScale(2, RoundingMode.HALF_UP);
        calc.setFinalSettlementAmount(finalSettlement);

        return gratuityRepo.save(calc);
    }

    @Transactional
    public GratuityCalculation approve(Long id, Long approverEmployeeId) {
        GratuityCalculation calc = gratuityRepo.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gratuity record not found: " + id));
        Employee approver = employeeRepository.findById(approverEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver not found"));
        calc.setStatus(GratuityCalculation.GratuityStatus.APPROVED);
        calc.setApprovedBy(approver);
        return gratuityRepo.save(calc);
    }

    @Transactional
    public void delete(Long id) {
        if (!gratuityRepo.existsById(id)) throw new ResourceNotFoundException("Gratuity record not found: " + id);
        gratuityRepo.deleteById(id);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        return Long.parseLong(val.toString());
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        return new BigDecimal(val.toString());
    }
}
