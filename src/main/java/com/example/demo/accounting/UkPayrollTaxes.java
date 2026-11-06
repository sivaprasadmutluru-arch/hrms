package com.example.demo.accounting;

import java.math.BigDecimal;
import java.util.*;
import com.example.demo.common.exception.BadRequestException;

/** Recorded UK payroll deductions and employer costs; no tax tables or thresholds are inferred. */
public final class UkPayrollTaxes {
 public static final List<String> EMPLOYEE=List.of("paye","national_insurance","student_loan","postgraduate_loan");
 public static final List<String> EMPLOYER=List.of("employer_national_insurance","apprenticeship_levy");
 public static final Set<String> CATEGORIES=Set.of("UK_PAYE","UK_NATIONAL_INSURANCE","UK_STUDENT_LOAN","UK_POSTGRADUATE_LOAN","UK_APPRENTICESHIP_LEVY");
 public static Map<String,BigDecimal> validate(Map<String,BigDecimal> values){
  var result=new TreeMap<String,BigDecimal>();if(values==null)return result;
  for(var item:values.entrySet()){
   var value=item.getValue();
   if((!EMPLOYEE.contains(item.getKey()) && !EMPLOYER.contains(item.getKey())) || value==null || value.signum()<0 || value.scale()>2 || value.precision()>16)throw new BadRequestException("Enter valid, non-negative UK payroll amounts with at most two decimals");
   result.put(item.getKey(),PayrollBreakdown.money(value));
  }return result;
 }
 public static BigDecimal sum(Map<String,BigDecimal> values,List<String> keys){return keys.stream().map(k->PayrollBreakdown.money(values.get(k))).reduce(PayrollBreakdown.money(0),BigDecimal::add);}
 private UkPayrollTaxes(){}
}
