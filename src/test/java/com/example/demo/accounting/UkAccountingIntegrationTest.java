package com.example.demo.accounting;

import com.example.demo.auth.entity.*;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.payroll.entity.*;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
@Sql({"/db/migration/V42__organization_accounting.sql","/db/migration/V43__country_payroll_accounting.sql","/db/migration/V44__us_payroll_accounting.sql","/db/migration/V46__uk_payroll_accounting.sql","/db/migration/V45__staffing_contracts_billing.sql"})
class UkAccountingIntegrationTest {
 @Autowired com.example.demo.base.service.CompanyService companies;@Autowired com.example.demo.base.controller.CompanyController companyController;
 @Autowired com.example.demo.staffing.StaffingService staffing;
 @Autowired AccountingService service;@Autowired AccountingExportService exports;@Autowired AccountingController controller;
 @Autowired EntityManager em;@Autowired JdbcTemplate jdbc;
 Company root,branch,foreign;Organization org;Employee staff,missing,branchStaff;Payslip slip;Deduction pf,tds;
 YearMonth ym=YearMonth.now().minusMonths(1);
 BigDecimal amount(String n){return new BigDecimal(n).setScale(2);}
 @BeforeEach void setup(){
  TenantContext.clear();org=new Organization();org.setName("Accounting fixture "+UUID.randomUUID());org.setSlug("accounting-"+UUID.randomUUID());em.persist(org);
  root=company("Root",org,null,"public","INR");branch=company("Branch",org,root,null,"AED");var other=new Organization();other.setName("Other organization");other.setSlug("other-"+UUID.randomUUID());em.persist(other);foreign=company("Foreign",other,null,"foreign_fixture","INR");
  staff=employee(root,"Salary employee");missing=employee(root,"Missing payslip");branchStaff=employee(branch,"Branch employee");
  pf=new Deduction();pf.setTitle("Employee PF fixture");pf.setCompany(root);em.persist(pf);tds=new Deduction();tds.setTitle("TDS fixture");tds.setCompany(root);em.persist(tds);
  slip=payslip(staff,root,"60000","3000","57000");em.flush();
  slip.setPayHeadData("{\"pretax_deductions\":[{\"deduction_id\":"+pf.getId()+",\"title\":\"PF\",\"amount\":2000,\"employer_contribution_amount\":2000}],\"tax_deductions\":[{\"deduction_id\":"+tds.getId()+",\"title\":\"TDS\",\"amount\":1000}]}");em.flush();
  signIn("ROLE_PLATFORM_SUPER_ADMIN");service.mapDeduction(root.getId(),new AccountingService.MappingRequest(pf.getId(),"PF"));service.mapDeduction(root.getId(),new AccountingService.MappingRequest(tds.getId(),"TDS"));
 }
 Company company(String name,Organization organization,Company parent,String schema,String currency){var c=new Company();c.setName(name+UUID.randomUUID());c.setOrganization(organization);c.setSchemaName(schema);c.setCurrency(currency);c.setCountry("India");if(parent!=null){c.setParentCompany(parent);c.setCompanyType(Company.CompanyType.BRANCH);}em.persist(c);return c;}
 Employee employee(Company company,String name){var e=new Employee();e.setCompany(company);e.setFirstName(name);e.setBadgeId("FIX-"+UUID.randomUUID());em.persist(e);return e;}
 Payslip payslip(Employee e,Company c,String gross,String deduction,String net){var p=new Payslip();p.setCompany(c);p.setEmployee(e);p.setStartDate(ym.atDay(1));p.setEndDate(ym.atEndOfMonth());p.setBasicPay(amount(gross));p.setGrossPay(amount(gross));p.setDeduction(amount(deduction));p.setNetPay(amount(net));p.setStatus(Payslip.PayslipStatus.CONFIRMED);p.setPayHeadData("{}");em.persist(p);return p;}
 void signIn(String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-accountant",null,List.of(new SimpleGrantedAuthority(role),new SimpleGrantedAuthority("payroll:view"),new SimpleGrantedAuthority("payroll:approve"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(-1L,null,null,List.of()));CompanyContext.set(root.getId());}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 @SuppressWarnings("unchecked") List<Map<String,Object>> salaryRows(boolean organization){return (List<Map<String,Object>>)service.salary(root.getId(),ym.toString(),organization,null).get("rows");}
 Map<String,Object> salaryRow(){return salaryRows(false).stream().filter(r->Objects.equals(r.get("payslip_id"),slip.getId())).findFirst().orElseThrow();}
 AccountingService.PayrollPostRequest post(String requestKey){return new AccountingService.PayrollPostRequest(ym.toString(),false,List.of(slip.getId()),requestKey,"BANK");}
 AccountingService.JournalRequest expense(String key,String total){return new AccountingService.JournalRequest(key,LocalDate.now(),"EXPENSE","Office expense fixture","REF-EXP",List.of(new AccountingService.Line("GENERAL_EXPENSE",amount(total),amount("0")),new AccountingService.Line("BANK",amount("0"),amount(total))));}
 long entries(){return jdbc.queryForObject("SELECT count(*) FROM public.accounting_entries WHERE organization_id=?",Long.class,org.getId());}

 @Test void fourLaunchCountriesResolveToDistinctProfiles(){assertThat(AccountingCountryProfile.from("India").code()).isEqualTo("IN");assertThat(AccountingCountryProfile.from("USA").code()).isEqualTo("US");assertThat(AccountingCountryProfile.from("Dubai").code()).isEqualTo("AE");for(String alias:List.of("United Kingdom","UK","GB","U.K."))assertThat(AccountingCountryProfile.from(alias).code()).isEqualTo("GB");}
 @Test void ukPayrollReviewPostsSeparateLiabilitiesAndEmployerCosts()throws Exception {
  root.setCountry("United Kingdom");root.setCurrency("GBP");slip.setGrossPay(amount("5000"));slip.setBasicPay(amount("5000"));slip.setDeduction(amount("1300"));slip.setNetPay(amount("3700"));slip.setPayHeadData("{}");em.flush();
  var taxes=Map.of("paye",amount("800"),"national_insurance",amount("200"),"student_loan",amount("100"),"postgraduate_loan",amount("100"),"employer_national_insurance",amount("600"),"apprenticeship_levy",amount("25"));
  service.reviewPayroll(root.getId(),slip.getId(),new AccountingService.ReviewRequest(amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),"Verified UK payroll register",amount("100"),amount("150"),Map.of(),taxes));
  var row=salaryRow();assertThat(row.get("uk_employee_taxes")).isEqualTo(amount("1200"));assertThat(row.get("employer_contributions")).isEqualTo(amount("775"));assertThat(row.get("total_cost")).isEqualTo(amount("5775"));assertThat(row.get("other_deductions")).isEqualTo(amount("0"));
  service.postPayroll(root.getId(),post("uk-payroll"));service.postPayroll(root.getId(),post("uk-retry"));assertThat(entries()).isEqualTo(1);
  assertThat(jdbc.queryForObject("SELECT sum(debit-credit) FROM public.accounting_lines l JOIN public.accounting_entries e ON e.id=l.entry_id WHERE e.company_id=?",BigDecimal.class,root.getId())).isEqualByComparingTo("0");
  assertThat(jdbc.queryForObject("SELECT sum(credit) FROM public.accounting_lines l JOIN public.accounting_entries e ON e.id=l.entry_id WHERE e.company_id=? AND account_code='UK_NATIONAL_INSURANCE_PAYABLE'",BigDecimal.class,root.getId())).isEqualByComparingTo("800");
  try(var wb=new XSSFWorkbook(new ByteArrayInputStream(exports.salary(root.getId(),ym.toString(),false,null)))){var labels=new ArrayList<String>();wb.getSheet("Salary register").getRow(0).forEach(c->labels.add(c.getStringCellValue()));assertThat(labels).contains("PAYE income tax","Employer National Insurance","Apprenticeship Levy").doesNotContain("TDS","US federal");assertThat(wb.getCreationHelper().createFormulaEvaluator().evaluate(wb.getSheet("Summary").getRow(1).getCell(5)).getNumberValue()).isEqualTo(775);}
 }
 @Test void ukSnapshotMappingsAndIncomeWithholdingAreCountrySpecific(){root.setCountry("United Kingdom");em.flush();service.mapDeduction(root.getId(),new AccountingService.MappingRequest(pf.getId(),"UK_NATIONAL_INSURANCE"));service.mapDeduction(root.getId(),new AccountingService.MappingRequest(tds.getId(),"UK_PAYE"));assertThat(salaryRow().get("uk_national_insurance")).isEqualTo(amount("2000"));assertThat(salaryRow().get("uk_employer_national_insurance")).isEqualTo(amount("2000"));assertThat(salaryRow().get("uk_paye")).isEqualTo(amount("1000"));assertThat(salaryRow().get("classified")).isEqualTo(true);service.mapDeduction(root.getId(),new AccountingService.MappingRequest(0,"UK_PAYE"));var parsed=PayrollBreakdown.parse("{\"federal_tax\":100}",Map.of(0L,"UK_PAYE"),amount("100"));assertThat(parsed.ukTaxes().get("paye")).isEqualTo(amount("100"));}
 @Test void ukClassificationsCannotLeakIntoIndiaOrUs(){assertThatThrownBy(()->service.mapDeduction(root.getId(),new AccountingService.MappingRequest(pf.getId(),"UK_PAYE"))).hasMessageContaining("UK country profile");root.setCountry("United States");em.flush();assertThatThrownBy(()->service.reviewPayroll(root.getId(),slip.getId(),new AccountingService.ReviewRequest(amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),"Wrong country",amount("0"),amount("0"),Map.of(),Map.of("paye",amount("1"))))).hasMessageContaining("UK organization");}
 @Test void negativeOrOverstatedUkReviewIsRejected(){root.setCountry("United Kingdom");em.flush();assertThatThrownBy(()->service.reviewPayroll(root.getId(),slip.getId(),new AccountingService.ReviewRequest(amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),"Bad amount",amount("0"),amount("0"),Map.of(),Map.of("paye",amount("-1"))))).hasMessageContaining("non-negative");assertThatThrownBy(()->service.reviewPayroll(root.getId(),slip.getId(),new AccountingService.ReviewRequest(amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),amount("0"),"Bad total",amount("0"),amount("0"),Map.of(),Map.of("paye",amount("3001"))))).hasMessageContaining("exceed");}
 @Test void apprenticeshipLevyCannotBecomeAnEmployeeDeduction(){var parsed=PayrollBreakdown.parse("{\"pretax_deductions\":[{\"deduction_id\":1,\"amount\":20,\"employer_contribution_amount\":30}]}",Map.of(1L,"UK_APPRENTICESHIP_LEVY"),amount("20"));assertThat(parsed.classified()).isFalse();assertThat(parsed.ukTaxes().get("apprenticeship_levy")).isEqualTo(amount("30"));}
 @Test void newHeadOfficesUseLaunchCurrencyWithoutChangingExistingCurrency(){for(var entry:Map.of("India","INR","United States","USD","United Arab Emirates","AED","United Kingdom","GBP").entrySet()){var newOrg=new Organization();newOrg.setName("Currency fixture "+UUID.randomUUID());newOrg.setSlug("currency-"+UUID.randomUUID());em.persist(newOrg);em.flush();var r=new com.example.demo.base.dto.CompanyRequest();r.setName("New office "+entry.getKey());r.setOrganizationId(newOrg.getId());r.setCountry(entry.getKey());assertThat(companies.createHeadOfficeRecord(r).getCurrency()).isEqualTo(entry.getValue());}assertThat(root.getCurrency()).isEqualTo("INR");}
 @Test void ukSkilledWorkerRequiresSponsorAndSettledStatusCanHaveNoExpiry(){assertThatThrownBy(()->staffing.authorization(root.getId(),null,new com.example.demo.staffing.StaffingService.Authorization(staff.getId(),"UK_SKILLED_WORKER",null,null,ym.atDay(1),LocalDate.now().plusYears(1),null,null,0))).hasMessageContaining("Sponsoring");assertThat(staffing.authorization(root.getId(),null,new com.example.demo.staffing.StaffingService.Authorization(staff.getId(),"UK_SETTLED",null,"HR reference",ym.atDay(1),null,null,"Reviewed by HR",0))).isPositive();}
 @Test void nonLaunchCountryChangeIsRejectedWithoutChangingSavedCountry(){assertThatThrownBy(()->companies.updateCountry(root.getId(),"Canada")).hasMessageContaining("launch country");assertThat(root.getCountry()).isEqualTo("India");}
}
