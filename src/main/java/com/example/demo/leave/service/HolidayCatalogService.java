package com.example.demo.leave.service;

import com.example.demo.base.service.StandardCompanySetup;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor
public class HolidayCatalogService {
 private final JdbcTemplate jdbc;
 public record Entry(String key,String name,LocalDate startDate,LocalDate endDate,boolean reviewDates,String source,List<String> aliases) {}
 public record Calendar(String country,int year,boolean partial,String message,List<Entry> entries) {}
 public record ImportRequest(String country,int year,List<String> keys,boolean confirmVariableDates) {}
 private static final String INDIA_SOURCE="https://www.indiapost.gov.in/holidays-list";
 private static final String UAE_SOURCE="https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays";
 public static String countryCode(String value) {
  String name=value==null?"":value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z]","");
  return switch(name){case "INDIA","IN","IND"->"INDIA";case "UAE","AE","ARE","DUBAI","ABUDHABI","UNITEDARABEMIRATES"->"UAE";default->"";};
 }
 private static Entry day(String key,String name,int year,int month,int day,boolean review,String source,String... aliases){var date=LocalDate.of(year,month,day);return new Entry(key,name,date,date,review,source,List.of(aliases));}
 public static Calendar catalog(String country,int year) {
  if(year<2026 || year>2100)throw new BadRequestException("Choose a year from 2026 to 2100");
  String code=countryCode(country);var entries=new ArrayList<Entry>();
  if(code.equals("INDIA")) {
   entries.add(day("REPUBLIC_DAY","Republic Day",year,1,26,false,INDIA_SOURCE));
   entries.add(day("INDEPENDENCE_DAY","Independence Day",year,8,15,false,INDIA_SOURCE));
   entries.add(day("GANDHI_JAYANTI","Gandhi Jayanti",year,10,2,false,INDIA_SOURCE,"Mahatma Gandhi's Birthday","Mahatma Gandhi Jayanti"));
   entries.add(day("CHRISTMAS","Christmas Day",year,12,25,false,INDIA_SOURCE,"Christmas"));
   if(year==2026) {
    entries.add(day("EID_FITR","Id-ul-Fitr",year,3,21,true,INDIA_SOURCE,"Eid al Fitr","Eid Al-Fitr"));
    entries.add(day("MAHAVIR_JAYANTI","Mahavir Jayanti",year,3,31,false,INDIA_SOURCE));
    entries.add(day("GOOD_FRIDAY","Good Friday",year,4,3,false,INDIA_SOURCE));
    entries.add(day("BUDDHA_PURNIMA","Buddha Purnima",year,5,1,false,INDIA_SOURCE));
    entries.add(day("EID_ADHA","Id-ul-Zuha",year,5,27,true,INDIA_SOURCE,"Eid Al Adha","Eid Al-Adha"));
    entries.add(day("MUHARRAM","Muharram",year,6,26,true,INDIA_SOURCE));
    entries.add(day("MILAD","Id-e-Milad",year,8,26,true,INDIA_SOURCE,"Prophet Mohammad's Birthday"));
    entries.add(day("DUSSEHRA","Dussehra",year,10,20,false,INDIA_SOURCE,"Vijay Dashmi","Vijayadashami"));
    entries.add(day("DIWALI","Diwali",year,11,8,false,INDIA_SOURCE,"Deepavali"));
    entries.add(day("GURU_NANAK","Guru Nanak Jayanti",year,11,24,false,INDIA_SOURCE,"Guru Nanak's Birthday"));
   }
  } else if(code.equals("UAE")) {
   entries.add(day("NEW_YEAR","New Year's Day",year,1,1,false,UAE_SOURCE,"New Year","Gregorian New Year"));
   entries.add(new Entry("NATIONAL_DAY","UAE National Day",LocalDate.of(year,12,2),LocalDate.of(year,12,3),false,UAE_SOURCE,List.of("National Day","Eid Al Etihad")));
   if(year==2026) {
    entries.add(new Entry("EID_FITR","Eid Al Fitr",LocalDate.of(year,3,19),LocalDate.of(year,3,22),true,"https://www.wam.ae/en/article/byvw3i7-eid-fitr-holiday-announced-for-private-sector",List.of("Eid Al-Fitr","Id-ul-Fitr")));
    entries.add(day("ARAFAH","Arafah Day",year,5,26,true,"https://mwodubai.org/announcements-and-notices/mwo-dubai-advisory-no-16-series-of-2026-observance-of-uae-holidays/","Arafat Day"));
    entries.add(new Entry("EID_ADHA","Eid Al Adha",LocalDate.of(year,5,27),LocalDate.of(year,5,29),true,"https://mwodubai.org/announcements-and-notices/mwo-dubai-advisory-no-16-series-of-2026-observance-of-uae-holidays/",List.of("Eid Al-Adha","Id-ul-Zuha")));
    entries.add(day("HIJRI_NEW_YEAR","Hijri New Year",year,6,15,true,"https://sharjah24.ae/en/Articles/2026/06/03/AL011","Islamic New Year"));
    entries.add(day("PROPHET_BIRTHDAY","Prophet Muhammad's Birthday",year,8,28,true,"https://www.wam.ae/en/article/c1wufxu-prophet-muhammad%E2%80%99s-birthday-holiday-for-ajman","Prophet Mohammed's Birthday","Mawlid"));
   }
  }
  entries.sort(Comparator.comparing(Entry::startDate));
  String message=code.isEmpty()?"Choose India or United Arab Emirates for a built-in calendar. Other countries can add custom holidays.":year==2026?"2026 reference calendar. Review national, state/local and sector applicability. Dates marked for review need confirmation before adding.":"Only fixed-date reference holidays are available for this year. Add festival, state/local and officially rescheduled dates manually.";
  return new Calendar(code.equals("INDIA")?"India":code.equals("UAE")?"United Arab Emirates":country==null?"":country,year,year!=2026 || code.isEmpty(),message,entries);
 }
 private Map<String,Object> company(Long id,boolean lock) {
  StandardCompanySetup.requireCompanyAccess(id);
  var rows=jdbc.queryForList("SELECT c.id,coalesce(c.schema_name,p.schema_name) schema_name,coalesce(nullif(trim(c.country),''),p.country) country FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id WHERE c.id=?"+(lock?" FOR UPDATE OF c":""),id);
  if(rows.isEmpty())throw new BadRequestException("Company not found");return rows.getFirst();
 }
 @Transactional(readOnly=true)
 public Calendar preview(Long companyId,String country,int year){var row=company(companyId,false);return catalog(country==null || country.isBlank()?(String)row.get("country"):country,year);}
 @Transactional
 public Map<String,Integer> apply(Long companyId,ImportRequest request) {
  var row=company(companyId,true);var calendar=catalog(request.country(),request.year());String code=countryCode(calendar.country());
  if(code.isEmpty() || request.keys()==null || request.keys().isEmpty() || request.keys().size()>50)throw new BadRequestException("Select holidays from a supported country calendar");
  var selected=new LinkedHashSet<>(request.keys());var entries=calendar.entries().stream().filter(e->selected.contains(e.key())).toList();
  if(entries.size()!=selected.size())throw new BadRequestException("The selected holiday calendar changed. Preview it again");
  if(entries.stream().anyMatch(Entry::reviewDates) && !request.confirmVariableDates())throw new BadRequestException("Confirm the dates marked for review before adding these holidays");
  String schema=(String)row.get("schema_name");if(schema==null || !schema.matches("[a-zA-Z_][a-zA-Z0-9_]*"))throw new BadRequestException("Company workspace is not ready");
  String table="\""+schema+"\".holidays";int added=0,skipped=0;
  var auth=SecurityContextHolder.getContext().getAuthentication();String actor=auth==null?"unknown":auth.getName();
  for(var entry:entries) {
   var tracked=jdbc.queryForList("SELECT holiday_id FROM public.holiday_catalog_imports WHERE company_id=? AND country=? AND calendar_year=? AND catalog_key=?",Long.class,companyId,code,request.year(),entry.key());
   Long id=tracked.isEmpty()?null:tracked.getFirst();
   if(id!=null && Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM "+table+" WHERE id=? AND company_id=?)",Boolean.class,id,companyId))){skipped++;continue;}
   var names=new ArrayList<String>();names.add(entry.name().toLowerCase(Locale.ROOT));entry.aliases().forEach(n->names.add(n.toLowerCase(Locale.ROOT)));
   var params=new ArrayList<Object>();params.add(companyId);params.add(request.year());params.addAll(names);
   var matches=jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND extract(year FROM start_date)=? AND lower(trim(name)) IN ("+String.join(",",Collections.nCopies(names.size(),"?"))+") ORDER BY id",Long.class,params.toArray());
   if(matches.isEmpty()) {id=jdbc.queryForObject("INSERT INTO "+table+" (name,start_date,end_date,recurring,company_id,is_active,created_at,updated_at) VALUES (?,?,?,false,?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,entry.name(),entry.startDate(),entry.endDate(),companyId);added++;}
   else {id=matches.getFirst();skipped++;}
   jdbc.update("INSERT INTO public.holiday_catalog_imports(company_id,country,calendar_year,catalog_key,holiday_id,source_url,dates_confirmed,imported_by) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(company_id,country,calendar_year,catalog_key) DO UPDATE SET holiday_id=excluded.holiday_id,source_url=excluded.source_url,dates_confirmed=excluded.dates_confirmed,imported_by=excluded.imported_by,imported_at=CURRENT_TIMESTAMP",companyId,code,request.year(),entry.key(),id,entry.source(),!entry.reviewDates() || request.confirmVariableDates(),actor);
  }
  return Map.of("added",added,"skipped",skipped);
 }
}
