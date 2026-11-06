package com.example.demo.accounting;
import com.example.demo.staffing.*;

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
class StaffingIntegrationTest {
 @Autowired com.example.demo.base.service.CompanyService companies;@Autowired com.example.demo.base.controller.CompanyController companyController;
 @Autowired StaffingService staffing;@Autowired StaffingExportService staffingExports;@Autowired StaffingController staffingController;
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

 void worker(){staffing.worker(root.getId(),new StaffingService.Worker(staff.getId(),"EMPLOYEE","FIXED_TERM","HOURLY",null,"Reviewed",0));}
 long client(){return staffing.client(root.getId(),null,new StaffingService.Client("Fixture client","billing@example.invalid","Fixture address",true,0));}
 StaffingService.Assignment assignmentRequest(long client,String rate,int version){return new StaffingService.Assignment(staff.getId(),client,"Client project","C-1","Remote","California","United States",ym.atDay(1),ym.atEndOfMonth(),null,amount(rate),amount("20"),amount("15"),amount("30"),"ACTIVE",version);}
 long assignment(long client){worker();return staffing.assignment(root.getId(),null,assignmentRequest(client,"10",0));}
 long time(long assignment,int day,String regular,String ot){return staffing.time(root.getId(),null,new StaffingService.TimeEntry(assignment,ym.atDay(day),amount(regular),amount(ot),"Fixture work",null,0));}
 void approve(long id){staffing.transition(root.getId(),id,new StaffingService.Transition("SUBMITTED",null,1));staffing.transition(root.getId(),id,new StaffingService.Transition("APPROVED",null,2));}
 long invoice(long client,long time,String key){return staffing.invoice(root.getId(),new StaffingService.Invoice(client,List.of(time),ym.atEndOfMonth(),LocalDate.now().plusDays(30),amount("10"),key));}
 @SuppressWarnings("unchecked") List<Map<String,Object>> list(String name){return (List<Map<String,Object>>)staffing.overview(root.getId(),ym.toString()).get(name);}
 @Test void endToEndInvoiceReceiptsAreBalancedAndIdempotent(){
  long client=client(),assignment=assignment(client),time=time(assignment,2,"8","2");approve(time);long invoice=invoice(client,time,"invoice-request");assertThat(invoice(client,time,"invoice-request")).isEqualTo(invoice);staffing.issue(root.getId(),invoice);staffing.issue(root.getId(),invoice);
  var receipt=new StaffingService.Receipt(LocalDate.now(),amount("100"),"BANK","CLIENT-PAY","receipt-request");long id=staffing.receipt(root.getId(),invoice,receipt);assertThat(staffing.receipt(root.getId(),invoice,receipt)).isEqualTo(id);
  assertThat(list("invoices").getFirst().get("subtotal")).isEqualTo(amount("220"));assertThat(list("invoices").getFirst().get("total")).isEqualTo(amount("242"));assertThat(list("invoices").getFirst().get("paid")).isEqualTo(amount("100"));
  assertThat(jdbc.queryForObject("SELECT sum(l.debit-l.credit) FROM public.accounting_lines l JOIN public.accounting_entries e ON e.id=l.entry_id WHERE e.company_id=?",BigDecimal.class,root.getId())).isEqualByComparingTo("0");
  em.refresh(slip);assertThat(slip.getStatus()).isEqualTo(Payslip.PayslipStatus.CONFIRMED);
  assertThatThrownBy(()->staffing.receipt(root.getId(),invoice,new StaffingService.Receipt(LocalDate.now(),amount("143"),"BANK","OVER","overpay"))).hasMessageContaining("outstanding");
  assertThatThrownBy(()->staffing.voidInvoice(root.getId(),invoice,new StaffingService.VoidInvoice(LocalDate.now(),"Correction","void-paid"))).hasMessageContaining("receipts");
 }
 @Test void draftTimeCannotBeBilledOrSkippedToApproval(){long client=client(),a=assignment(client),t=time(a,2,"8","0");assertThatThrownBy(()->invoice(client,t,"draft-bill")).hasMessageContaining("approved");assertThatThrownBy(()->staffing.transition(root.getId(),t,new StaffingService.Transition("APPROVED",null,1))).hasMessageContaining("transition");}
 @Test void duplicateAndOverlappingDailyHoursAreRejected(){long client=client(),a=assignment(client);time(a,2,"20","0");assertThatThrownBy(()->time(a,2,"1","0")).hasMessageContaining("already exists");long a2=staffing.assignment(root.getId(),null,assignmentRequest(client,"10",0));assertThatThrownBy(()->time(a2,2,"5","0")).hasMessageContaining("exceed 24");}
 @Test void approvedRatesRemainUnchangedAfterAssignmentEdit(){long client=client(),a=assignment(client),t=time(a,2,"8","0");approve(t);staffing.assignment(root.getId(),a,assignmentRequest(client,"99",1));assertThat(list("time_entries").getFirst().get("pay_rate")).isEqualTo(new BigDecimal("10.0000"));assertThatThrownBy(()->staffing.time(root.getId(),t,new StaffingService.TimeEntry(a,ym.atDay(2),amount("7"),amount("0"),null,null,3))).hasMessageContaining("draft/rejected");}
 @Test void staleWorkerAndTimeUpdatesAreRejected(){worker();assertThatThrownBy(()->staffing.worker(root.getId(),new StaffingService.Worker(staff.getId(),"EMPLOYEE","PERMANENT","HOURLY",null,null,0))).hasMessageContaining("another session");long c=client(),a=staffing.assignment(root.getId(),null,assignmentRequest(c,"10",0)),t=time(a,2,"8","0");assertThatThrownBy(()->staffing.transition(root.getId(),t,new StaffingService.Transition("SUBMITTED",null,0))).hasMessageContaining("another session");}
 @Test void voidReversesInvoiceAndReleasesTimeForRebilling(){long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);long i=invoice(c,t,"void-invoice");staffing.issue(root.getId(),i);staffing.voidInvoice(root.getId(),i,new StaffingService.VoidInvoice(LocalDate.now(),"Wrong reference","void-request"));assertThat(list("invoices").getFirst().get("status")).isEqualTo("VOID");assertThat(list("time_entries").getFirst().get("invoice_id")).isNull();assertThat(invoice(c,t,"replacement")).isNotEqualTo(i);assertThat(jdbc.queryForObject("SELECT sum(l.debit-l.credit) FROM public.accounting_lines l JOIN public.accounting_entries e ON e.id=l.entry_id WHERE e.company_id=? AND account_code='RECEIVABLES'",BigDecimal.class,root.getId())).isEqualByComparingTo("0");}
 @Test void issuedOrDraftInvoiceLocksItsTimeUntilVoid(){long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);invoice(c,t,"linked-time");assertThatThrownBy(()->staffing.transition(root.getId(),t,new StaffingService.Transition("REJECTED","Wrong hours",3))).hasMessageContaining("linked invoice");assertThatThrownBy(()->invoice(c,t,"double-bill")).hasMessageContaining("unbilled");}
 @Test void authorizationRequiresDatesSponsorAndScopedDocument(){var request=new StaffingService.Authorization(staff.getId(),"H1B",null,"CASE",ym.atDay(1),LocalDate.now().plusYears(1),null,null,0);assertThatThrownBy(()->staffing.authorization(root.getId(),null,request)).hasMessageContaining("Sponsoring");assertThatThrownBy(()->staffing.authorization(root.getId(),null,new StaffingService.Authorization(staff.getId(),"EAD",null,null,LocalDate.now(),null,null,null,0))).hasMessageContaining("Expiry");assertThatThrownBy(()->staffing.authorization(root.getId(),null,new StaffingService.Authorization(staff.getId(),"EAD",null,null,ym.atDay(1),LocalDate.now().plusYears(1),999999L,null,0))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void visaStatusDoesNotChangeWorkerClassificationOrPayroll(){worker();staffing.authorization(root.getId(),null,new StaffingService.Authorization(staff.getId(),"H1B","Fixture sponsor","CASE",ym.atDay(1),LocalDate.now().plusYears(1),null,"HR verified record",0));assertThat(list("workers").stream().filter(r->r.get("id").equals(staff.getId())).findFirst().orElseThrow().get("classification")).isEqualTo("EMPLOYEE");assertThat(salaryRow().get("tds")).isEqualTo(amount("1000"));assertThat(list("authorizations")).hasSize(1);}
 @Test void foreignClientAndWorkerCannotBeAssigned(){long c=client();worker();assertThatThrownBy(()->staffing.assignment(branch.getId(),null,assignmentRequest(c,"10",0))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->staffing.authorization(branch.getId(),null,new StaffingService.Authorization(staff.getId(),"CITIZEN",null,null,ym.atDay(1),null,null,null,0))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void projectTimeCanBeImportedOnceAndChangesBlockApproval(){long c=client(),a=assignment(c);var source=new com.example.demo.project.entity.TimeSheet();source.setCompany(root);source.setEmployee(staff);source.setDate(ym.atDay(2));source.setHours(amount("8"));em.persist(source);em.flush();long t=staffing.time(root.getId(),null,new StaffingService.TimeEntry(a,ym.atDay(2),amount("8"),amount("0"),null,source.getId(),0));staffing.transition(root.getId(),t,new StaffingService.Transition("SUBMITTED",null,1));source.setHours(amount("9"));em.flush();assertThatThrownBy(()->staffing.transition(root.getId(),t,new StaffingService.Transition("APPROVED",null,2))).hasMessageContaining("must match");}
 @Test void payrollWorkbookUsesOnlyApprovedTimeAndEvaluatedNumericFormula()throws Exception {long c=client(),a=assignment(c),t=time(a,2,"8","2");time(a,3,"4","0");approve(t);try(var wb=new XSSFWorkbook(new ByteArrayInputStream(staffingExports.payroll(root.getId(),ym.toString(),null)))){var sheet=wb.getSheetAt(0);assertThat(sheet.getLastRowNum()).isEqualTo(1);assertThat(sheet.getRow(1).getCell(12).getCellType()).isEqualTo(CellType.FORMULA);assertThat(wb.getCreationHelper().createFormulaEvaluator().evaluate(sheet.getRow(1).getCell(12)).getNumberValue()).isEqualTo(110);}}
 @Test void salariedWorkersHaveNoFabricatedHourlySalaryInExport()throws Exception {long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);staffing.worker(root.getId(),new StaffingService.Worker(staff.getId(),"EMPLOYEE","PERMANENT","SALARIED",null,null,1));try(var wb=new XSSFWorkbook(new ByteArrayInputStream(staffingExports.payroll(root.getId(),ym.toString(),null)))){assertThat(wb.getSheetAt(0).getRow(1).getCell(12)).isNull();}}
 @Test void clientInvoiceWorkbookContainsBillRatesButNoWorkerPayOrVisaData()throws Exception {long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);long i=invoice(c,t,"client-export");try(var wb=new XSSFWorkbook(new ByteArrayInputStream(staffingExports.invoice(root.getId(),i)))){var headers=new ArrayList<String>();wb.getSheetAt(0).getRow(8).forEach(cell->headers.add(cell.getStringCellValue()));assertThat(headers).contains("Bill rate","Amount").doesNotContain("Pay rate","Visa");assertThat(wb.getSheetAt(0).getRow(9).getCell(5).getNumericCellValue()).isEqualTo(160);}}
 @Test void currencyChangeBlocksInvoicePosting(){long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);long i=invoice(c,t,"currency-invoice");root.setCurrency("AED");em.flush();assertThatThrownBy(()->staffing.issue(root.getId(),i)).hasMessageContaining("currency");}
 @Test void invoiceRetryWithDifferentPayloadIsRejected(){long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);invoice(c,t,"same-key");assertThatThrownBy(()->staffing.invoice(root.getId(),new StaffingService.Invoice(c,List.of(t),ym.atEndOfMonth(),LocalDate.now().plusDays(50),amount("10"),"same-key"))).hasMessageContaining("different invoice");}
 @Test void zeroOvertimeRateCannotSilentlyUnderpayHours(){long c=client(),a=assignment(c);var r=assignmentRequest(c,"10",1);staffing.assignment(root.getId(),a,new StaffingService.Assignment(r.employeeId(),r.clientId(),r.title(),r.contractReference(),r.workLocation(),r.workState(),r.workCountry(),r.startsOn(),r.endsOn(),null,r.payRate(),r.billRate(),amount("0"),r.overtimeBillRate(),"ACTIVE",1));assertThatThrownBy(()->time(a,2,"8","1")).hasMessageContaining("overtime");}
 @Test void employeeRoleCannotReadOrWriteStaffing(){signIn("ROLE_EMPLOYEE");assertThatThrownBy(()->staffingController.overview(root.getId(),ym.toString())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->staffingController.client(root.getId(),new StaffingService.Client("Unauthorized",null,null,true,0))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void taxAccountTypeCannotMisclassifyInvoiceLiability(){long c=client(),a=assignment(c),t=time(a,2,"8","0");approve(t);long i=invoice(c,t,"bad-tax-account");service.createAccount(root.getId(),"SALES_TAX_PAYABLE","Wrong fixture type","EXPENSE");assertThatThrownBy(()->staffing.issue(root.getId(),i)).hasMessageContaining("liability");assertThat(entries()).isZero();}
 @Test void readOnlyFinanceUserCannotApproveTime(){long c=client(),a=assignment(c),t=time(a,2,"8","0");SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("read-only",null,List.of(new SimpleGrantedAuthority("ROLE_ACCOUNTANT"),new SimpleGrantedAuthority("payroll:view"))));assertThatThrownBy(()->staffingController.transition(root.getId(),t,new StaffingService.Transition("SUBMITTED",null,1))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}

}
