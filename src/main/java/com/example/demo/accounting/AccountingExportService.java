package com.example.demo.accounting;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellReference;
import java.io.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class AccountingExportService {
 private final AccountingService accounting;
 private static final String[][] SALARY={
  {"badge_id","Employee ID"},{"employee_name","Employee name"},{"department","Department"},{"company","Company"},{"currency","Currency"},
  {"start_date","Period start"},{"end_date","Period end"},{"basic_pay","Basic salary"},{"housing_allowance","Housing / HRA"},{"transport_allowance","Transport"},{"other_allowance","Other allowances"},
  {"gross_pay","Gross salary"},{"loss_of_pay","Loss of pay"},{"attendance_deduction","Attendance deductions"},{"pf","Employee PF"},{"tds","TDS"},{"loan_recovery","Loan recovery"},{"other_deductions","Other / unclassified deductions"},{"deduction","Total deductions"},
  {"net_additions","Net additions / reimbursements"},{"net_pay","Net salary"},{"employer_pf","Employer PF"},{"employer_other","Other employer contributions"},{"total_cost","Employer cost"},{"paid","Recorded paid"},
  {"status","Payslip status"},{"payment_date","Payment date"},{"payment_reference","Payment reference"},{"review_notes","Review notes"}};
 @org.springframework.transaction.annotation.Transactional(isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public byte[] salary(long companyId,String month,boolean organization,List<Long> employees)throws IOException{
  var data=accounting.salary(companyId,month,organization,employees);
  var profile=(AccountingCountryProfile)data.get("country_profile");
  @SuppressWarnings("unchecked")var reportRows=(List<Map<String,Object>>)data.get("rows");
  var columns=new ArrayList<String[]>();
  for(var column:SALARY){boolean indiaField=Set.of("pf","tds","employer_pf").contains(column[0]);
   if(!profile.india() && indiaField && reportRows.stream().noneMatch(r->PayrollBreakdown.money(r.get(column[0])).signum()!=0))continue;
   columns.add(new String[]{column[0],!profile.india() && indiaField?"Legacy India "+column[1]:column[1]});}
  if(!profile.india()){columns.add(new String[]{"pension",profile.uk()?"Employee workplace pension":"Employee pension / contributions"});columns.add(new String[]{"employer_pension",profile.uk()?"Employer workplace pension":"Employer pension / contributions"});}
  if(profile.india()){columns.add(new String[]{"esi","Employee ESI"});columns.add(new String[]{"employer_esi","Employer ESI"});columns.add(new String[]{"professional_tax","Professional Tax"});columns.add(new String[]{"lwf","Employee LWF"});columns.add(new String[]{"employer_lwf","Employer LWF"});columns.add(new String[]{"gratuity_provision","Gratuity Provision"});}
  if(profile.us())for(String tax:java.util.List.of("federal","state","local","social_security","medicare","employer_social_security","employer_medicare"))columns.add(new String[]{"us_"+tax,"US "+tax.replace('_',' ')});
  if(profile.uk())for(String[] tax:new String[][]{{"paye","PAYE income tax"},{"national_insurance","Employee National Insurance"},{"student_loan","Student loan"},{"postgraduate_loan","Postgraduate loan"},{"employer_national_insurance","Employer National Insurance"},{"apprenticeship_levy","Apprenticeship Levy"}})columns.add(new String[]{"uk_"+tax[0],tax[1]});
  columns.add(new String[]{"employer_contributions","Total employer contributions / taxes"});columns.add(new String[]{"country","Organization country"});
  String[][] salaryColumns=columns.toArray(String[][]::new);
  try(var wb=new XSSFWorkbook();var output=new ByteArrayOutputStream()){
   Sheet sheet=wb.createSheet("Salary register");header(wb,sheet,Arrays.stream(salaryColumns).map(c->c[1]).toArray(String[]::new));CellStyle money=money(wb);
   @SuppressWarnings("unchecked")var rows=(List<Map<String,Object>>)data.get("rows");int index=1;
   for(var record:rows){Row row=sheet.createRow(index++);for(int col=0;col<salaryColumns.length;col++){String key=salaryColumns[col][0];Object value=record.get(key);if((key.equals("pf") || key.equals("tds") || key.equals("employer_pf") || key.equals("pension") || key.equals("employer_pension") || key.equals("esi") || key.equals("employer_esi") || key.equals("professional_tax") || key.equals("lwf") || key.equals("employer_lwf") || key.equals("gratuity_provision") || key.startsWith("us_") || key.startsWith("uk_")) && Boolean.FALSE.equals(record.get("pf_known")))value=null;cell(row,col,value,money);}}
   sheet.createFreezePane(5,1);sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0,Math.max(0,index-1),0,salaryColumns.length-1));
   Sheet summary=wb.createSheet("Summary");header(wb,summary,"Currency","Gross salary","Deductions","Net salary","Recorded paid",profile.india()?"Employer PF":"Employer contributions / taxes","Employer cost");
   @SuppressWarnings("unchecked")var totals=(Map<String,Map<String,Object>>)data.get("totals");int rowIndex=1;
   for(String currency:totals.keySet()){Row row=summary.createRow(rowIndex++);row.createCell(0).setCellValue(currency);String[] fields={"gross_pay","deduction","net_pay","paid",profile.india()?"employer_pf":"employer_contributions","total_cost"};for(int n=0;n<fields.length;n++){int salaryCol=0;for(int c=0;c<salaryColumns.length;c++)if(salaryColumns[c][0].equals(fields[n]))salaryCol=c;Cell c=row.createCell(n+1);if(index>1)c.setCellFormula("SUMIF('Salary register'!$E$2:$E$"+index+",A"+rowIndex+",'Salary register'!$"+CellReference.convertNumToColString(salaryCol)+"$2:$"+CellReference.convertNumToColString(salaryCol)+"$"+index+")");else c.setCellValue(0);c.setCellStyle(money);}}
   Sheet notes=wb.createSheet("Read me");String[] text={"Organization: "+data.get("organization"),"Payroll month: "+month,String.valueOf(data.get("basis")),"Country profile: "+profile.name()+" — "+profile.guidance(),"Contribution and withholding columns use configured mappings or an explicit review. Blank means not classified, not zero liability.","Missing payslips are included with blank amounts. Prepare payroll before posting.","Employer cost = gross less LOP/attendance deductions + net additions + employer contributions.","Totals remain separate by currency. This workbook does not calculate statutory rates or file returns.","Recorded paid amounts come from payslip status. Verify bank/cash payment references during reconciliation."};for(int n=0;n<text.length;n++)notes.createRow(n).createCell(0).setCellValue(text[n]);notes.setColumnWidth(0,120*256);
   for(Sheet s:List.of(sheet,summary)){for(int c=0;c<s.getRow(0).getLastCellNum();c++)s.setColumnWidth(c,(c==1?28:20)*256);s.setRepeatingRows(new org.apache.poi.ss.util.CellRangeAddress(0,0,-1,-1));s.getPrintSetup().setLandscape(true);s.setFitToPage(true);s.getPrintSetup().setFitWidth((short)1);}
   wb.setForceFormulaRecalculation(true);wb.write(output);return output.toByteArray();
  }
 }
 @org.springframework.transaction.annotation.Transactional(isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public byte[] ledger(long companyId,String month,boolean organization)throws IOException{
  var first=accounting.ledger(companyId,month,organization,0,500);long total=((Number)first.get("total")).longValue();if(total>20000)throw new com.example.demo.common.exception.BadRequestException("Export exceeds 20,000 journals. Select a company");
  try(var wb=new XSSFWorkbook();var output=new ByteArrayOutputStream()){
   Sheet journals=wb.createSheet("Journal lines");header(wb,journals,"Entry","Date","Company","Currency","Type","Description","Reference","Account","Account name","Debit","Credit","Created by","Reversal of","Reversed by");CellStyle money=money(wb);int index=1;
   for(int page=0;page<Math.max(1,(int)Math.ceil(total/500.0));page++){@SuppressWarnings("unchecked")var entries=(List<Map<String,Object>>)(page==0?first:accounting.ledger(companyId,month,organization,page,500)).get("entries");for(var entry:entries){@SuppressWarnings("unchecked")var lines=(List<Map<String,Object>>)entry.get("lines");for(var line:lines){Row row=journals.createRow(index++);Object[] values={entry.get("id"),entry.get("entry_date"),entry.get("company"),entry.get("currency"),entry.get("type"),entry.get("description"),entry.get("reference"),line.get("account_code"),line.get("account_name"),line.get("debit"),line.get("credit"),entry.get("created_by"),entry.get("reversal_of"),entry.get("reversed_by")};for(int c=0;c<values.length;c++)cell(row,c,values[c],money);}}}
   Sheet trial=wb.createSheet("Trial balance");header(wb,trial,"Currency","Account","Name","Type","Debit","Credit","Debit balance");@SuppressWarnings("unchecked")var balances=(List<Map<String,Object>>)first.get("trial_balance");int n=1;for(var balance:balances){var row=trial.createRow(n++);String[] fields={"currency","code","name","type","debit","credit","balance"};for(int c=0;c<fields.length;c++)cell(row,c,balance.get(fields[c]),money);}
   Sheet profit=wb.createSheet("Profit and loss");header(wb,profit,"Currency","Income","Expenses","Profit / loss");@SuppressWarnings("unchecked")var profits=(List<Map<String,Object>>)first.get("profit_loss");n=1;for(var item:profits){var row=profit.createRow(n++);cell(row,0,item.get("currency"),money);cell(row,1,item.get("income"),money);cell(row,2,item.get("expenses"),money);cell(row,3,PayrollBreakdown.money(item.get("income")).subtract(PayrollBreakdown.money(item.get("expenses"))),money);}
   for(Sheet sheet:wb){sheet.createFreezePane(0,1);for(int c=0;c<sheet.getRow(0).getLastCellNum();c++)sheet.setColumnWidth(c,24*256);}wb.write(output);return output.toByteArray();
  }
 }
 private static void header(Workbook wb,Sheet sheet,String... headings){CellStyle style=wb.createCellStyle();style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());style.setFillPattern(FillPatternType.SOLID_FOREGROUND);Font font=wb.createFont();font.setBold(true);font.setColor(IndexedColors.WHITE.getIndex());style.setFont(font);Row row=sheet.createRow(0);row.setHeightInPoints(28);for(int i=0;i<headings.length;i++){Cell c=row.createCell(i);c.setCellValue(headings[i]);c.setCellStyle(style);}}
 private static CellStyle money(Workbook wb){CellStyle style=wb.createCellStyle();style.setDataFormat(wb.createDataFormat().getFormat("#,##0.00;[Red](#,##0.00)"));return style;}
 private static void cell(Row row,int index,Object value,CellStyle money){Cell cell=row.createCell(index);if(value==null)return;if(value instanceof Number number){cell.setCellValue(number.doubleValue());cell.setCellStyle(money);}else if(value instanceof Collection<?> collection)cell.setCellValue(collection.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining("; ")));else cell.setCellValue(value.toString());}
}
