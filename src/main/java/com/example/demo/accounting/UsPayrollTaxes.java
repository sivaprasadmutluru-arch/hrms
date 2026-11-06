package com.example.demo.accounting;

import java.math.BigDecimal;
import java.util.*;
import com.example.demo.common.exception.BadRequestException;

/** Recorded US withholding and employer tax amounts, without tax-rate assumptions. */
public final class UsPayrollTaxes {
 public static final List<String> EMPLOYEE=List.of("federal","state","local","social_security","medicare");
 public static final List<String> EMPLOYER=List.of("employer_social_security","employer_medicare");
 public static final Set<String> CATEGORIES=Set.of("US_FEDERAL","US_STATE","US_LOCAL","US_SOCIAL_SECURITY","US_MEDICARE");
 public static Map<String,BigDecimal> validate(Map<String,BigDecimal> values){
  var result=new TreeMap<String,BigDecimal>();if(values==null)return result;
  for(var item:values.entrySet()){
   var value=item.getValue();
   if((!EMPLOYEE.contains(item.getKey()) && !EMPLOYER.contains(item.getKey())) || value==null || value.signum()<0 || value.scale()>2 || value.precision()>16)throw new BadRequestException("Enter valid, non-negative US tax amounts with at most two decimals");
   result.put(item.getKey(),PayrollBreakdown.money(value));
  }return result;
 }
 public static BigDecimal sum(Map<String,BigDecimal> values,List<String> keys){return keys.stream().map(k->PayrollBreakdown.money(values.get(k))).reduce(PayrollBreakdown.money(0),BigDecimal::add);}
 private UsPayrollTaxes(){}
}
