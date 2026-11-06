package com.example.demo.accounting;
import com.fasterxml.jackson.databind.*;
import java.math.*;
import java.util.*;

/** Reports recorded payroll amounts. No PF percentage, wage ceiling or tax-slab assumptions. */
public final class PayrollBreakdown {
 private static final ObjectMapper JSON=new ObjectMapper();
 /** India-specific statutory categories added in V53. */
 public static final Set<String> INDIA_CATEGORIES = Set.of("IN_ESI","IN_PT","IN_LWF");
 public record Result(BigDecimal pf,BigDecimal employerPf,BigDecimal tds,BigDecimal loans,BigDecimal lop,BigDecimal attendance,BigDecimal employerOther,BigDecimal pension,BigDecimal employerPension,Map<String,BigDecimal> usTaxes,Map<String,BigDecimal> ukTaxes,Map<String,BigDecimal> indiaTaxes,boolean classified,List<String> warnings) {}
 public static BigDecimal money(Object value){if(value==null)return BigDecimal.ZERO.setScale(2);try{return new BigDecimal(value.toString()).setScale(2,RoundingMode.HALF_UP);}catch(Exception e){throw new IllegalArgumentException("Invalid recorded money amount");}}
 public static Result parse(String snapshot,Map<Long,String> mapping,BigDecimal deductions){
  BigDecimal pf=money(0),epf=money(0),tds=money(0),loans=money(0),lop=money(0),attendance=money(0),employerOther=money(0),pension=money(0),employerPension=money(0);var warnings=new ArrayList<String>();boolean classified=true;var usTaxes=new TreeMap<String,BigDecimal>();var ukTaxes=new TreeMap<String,BigDecimal>();var indiaTaxes=new TreeMap<String,BigDecimal>();
  JsonNode root;
  try{root=snapshot==null || snapshot.isBlank()?JSON.createObjectNode():JSON.readTree(snapshot);if(!root.isObject())throw new IllegalArgumentException();}
  catch(Exception e){root=JSON.createObjectNode();warnings.add("Payroll breakdown is missing or invalid");classified=false;}
  boolean hasBreakdown=false;BigDecimal accounted=money(0);
  for(String group:List.of("pretax_deductions","tax_deductions","post_tax_deductions","net_deductions")){
   for(JsonNode line:root.path(group)){
    BigDecimal amount=money(line.path("amount").asText("0")),employer=money(line.path("employer_contribution_amount").asText("0"));
    if(amount.signum()==0 && employer.signum()==0)continue;hasBreakdown=true;accounted=accounted.add(amount);
    String category=mapping.get(line.path("deduction_id").asLong(-1));
    if(category==null){classified=false;warnings.add("Classify deduction: "+line.path("title").asText("Unnamed deduction"));continue;}
    if(UkPayrollTaxes.CATEGORIES.contains(category)){
     String taxKey=category.substring(3).toLowerCase(Locale.ROOT);
     if(taxKey.equals("apprenticeship_levy")){ukTaxes.merge(taxKey,employer,BigDecimal::add);if(amount.signum()!=0){classified=false;warnings.add("Apprenticeship Levy is an employer cost; review employee deductions");}}
     else {ukTaxes.merge(taxKey,amount,BigDecimal::add);if(taxKey.equals("national_insurance"))ukTaxes.merge("employer_national_insurance",employer,BigDecimal::add);else employerOther=employerOther.add(employer);}
     continue;
    }
    if(UsPayrollTaxes.CATEGORIES.contains(category)){
     String taxKey=category.substring(3).toLowerCase(Locale.ROOT);usTaxes.merge(taxKey,amount,BigDecimal::add);
     if(taxKey.equals("social_security") || taxKey.equals("medicare"))usTaxes.merge("employer_"+taxKey,employer,BigDecimal::add);else employerOther=employerOther.add(employer);
     continue;
    }
    // India ESI, PT, LWF (IN_ESI → "esi", IN_PT → "professional_tax", IN_LWF → "lwf")
    if(INDIA_CATEGORIES.contains(category)){
     String taxKey=category.substring(3).toLowerCase(Locale.ROOT);
     if(taxKey.equals("pt"))taxKey="professional_tax";
     indiaTaxes.merge(taxKey,amount,BigDecimal::add);
     // ESI and LWF have employer contributions; PT is employee-only
     if(taxKey.equals("esi"))indiaTaxes.merge("employer_esi",employer,BigDecimal::add);
     else if(taxKey.equals("lwf"))indiaTaxes.merge("employer_lwf",employer,BigDecimal::add);
     else employerOther=employerOther.add(employer);
     continue;
    }
    switch(category){case "PF"->{pf=pf.add(amount);epf=epf.add(employer);}case "PENSION"->{pension=pension.add(amount);employerPension=employerPension.add(employer);}case "TDS"->{tds=tds.add(amount);employerOther=employerOther.add(employer);}case "LOAN"->{loans=loans.add(amount);employerOther=employerOther.add(employer);}default->employerOther=employerOther.add(employer);}
   }
  }
  BigDecimal tax=money(root.path("federal_tax").asText("0"));
  accounted=accounted.add(tax);if(tax.signum()!=0){hasBreakdown=true;String category=mapping.get(0L);if(category==null){classified=false;warnings.add("Classify tax-bracket withholding");}else if(category.equals("TDS"))tds=tds.add(tax);else if(category.equals("UK_PAYE"))ukTaxes.merge("paye",tax,BigDecimal::add);else if(category.equals("US_FEDERAL"))usTaxes.merge("federal",tax,BigDecimal::add);else if(!category.equals("OTHER")){classified=false;warnings.add("Classify income withholding for the organization country");}}
  for(JsonNode line:root.path("loan_deductions")){BigDecimal amount=money(line.path("amount").asText("0"));loans=loans.add(amount);accounted=accounted.add(amount);hasBreakdown=true;}
  lop=money(root.path("loss_of_pay").asText("0"));attendance=money(root.path("attendance_deduction").asText("0"));
  accounted=accounted.add(lop).add(attendance);if(lop.signum()!=0 || attendance.signum()!=0)hasBreakdown=true;
  if(accounted.subtract(deductions).abs().compareTo(new BigDecimal("0.01"))>0){classified=false;warnings.add("Recorded deduction breakdown differs from payslip total; review the salary classification");}
  if(!hasBreakdown && deductions.signum()>0){classified=false;warnings.add("Deduction breakdown is unavailable; review payroll deductions");}
  Set<String> statutory=new HashSet<>(Set.of("PF","TDS","PENSION","US_FEDERAL","US_STATE","US_LOCAL","US_SOCIAL_SECURITY","US_MEDICARE","UK_PAYE","UK_NATIONAL_INSURANCE","UK_STUDENT_LOAN","UK_POSTGRADUATE_LOAN","UK_APPRENTICESHIP_LEVY"));statutory.addAll(INDIA_CATEGORIES);
  for(String group:List.of("basic_pay_deductions","gross_pay_deductions"))for(JsonNode line:root.path(group))if(statutory.contains(mapping.getOrDefault(line.path("deduction_id").asLong(-1),"OTHER")) && money(line.path("amount").asText("0")).signum()!=0){classified=false;warnings.add("Statutory deduction is configured as a compensation adjustment; review payroll");}
  BigDecimal indiaTaxEmployee=indiaTaxes.entrySet().stream().filter(e->!e.getKey().startsWith("employer_")).map(Map.Entry::getValue).reduce(money(0),BigDecimal::add);
  if(pf.add(tds).add(pension).add(indiaTaxEmployee).add(UsPayrollTaxes.sum(usTaxes,UsPayrollTaxes.EMPLOYEE)).add(UkPayrollTaxes.sum(ukTaxes,UkPayrollTaxes.EMPLOYEE)).add(loans).add(lop).add(attendance).compareTo(deductions)>0){classified=false;warnings.add("Deduction components exceed recorded total deductions");}
  return new Result(pf,epf,tds,loans,lop,attendance,employerOther,pension,employerPension,Map.copyOf(usTaxes),Map.copyOf(ukTaxes),Map.copyOf(indiaTaxes),classified,warnings.stream().distinct().toList());
 }
 private PayrollBreakdown(){}
}
