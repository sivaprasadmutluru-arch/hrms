package com.example.demo.leave;
import com.example.demo.leave.service.*;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.base.entity.Company;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
class HolidayCatalogIntegrationTest {
 @Autowired HolidayCatalogService service;@Autowired LeaveService leaveService;@Autowired EntityManager em;@Autowired JdbcTemplate jdbc;
 Company company;
 @BeforeEach void setup(){TenantContext.clear();jdbc.execute("CREATE TABLE IF NOT EXISTS public.holiday_catalog_imports(company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,country VARCHAR(16) NOT NULL,calendar_year INTEGER NOT NULL,catalog_key VARCHAR(80) NOT NULL,holiday_id BIGINT NOT NULL,source_url TEXT NOT NULL,dates_confirmed BOOLEAN NOT NULL DEFAULT false,imported_by VARCHAR(255),imported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(company_id,country,calendar_year,catalog_key))");company=new Company();company.setName("Holiday fixture "+UUID.randomUUID());company.setSchemaName("public");company.setCountry("India");em.persist(company);em.flush();SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test-admin",null,List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(-1L,null,null,List.of()));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();TenantContext.clear();}
 HolidayCatalogService.ImportRequest request(String country,int year,boolean confirmed,String... keys){return new HolidayCatalogService.ImportRequest(country,year,List.of(keys),confirmed);}
 long count(){return jdbc.queryForObject("SELECT count(*) FROM public.holidays WHERE company_id=?",Long.class,company.getId());}
 @Test void previewUsesCountryWithoutImportingAnything(){var preview=service.preview(company.getId(),null,2026);assertThat(preview.country()).isEqualTo("India");assertThat(preview.entries()).hasSize(14);assertThat(count()).isZero();}
 @Test void selectedHolidaysAreAddedOnceAndAffectWorkingDays(){var request=request("India",2026,false,"REPUBLIC_DAY","DIWALI");assertThat(service.apply(company.getId(),request)).containsEntry("added",2);assertThat(service.apply(company.getId(),request)).containsEntry("added",0).containsEntry("skipped",2);assertThat(count()).isEqualTo(2);var type=new LeaveType();type.setExcludeHoliday(true);type.setExcludeWeekend(false);type.setExcludeCompanyLeave(false);var date=LocalDate.of(2026,1,26);assertThat(leaveService.calculateWorkingDays(date,date,company.getId(),type)).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM public.holiday_allocations",Long.class)).isZero();}
 @Test void editedImportedHolidaysArePreserved(){var request=request("India",2026,false,"REPUBLIC_DAY");service.apply(company.getId(),request);jdbc.update("UPDATE public.holidays SET name='Company observance',start_date='2026-01-27',end_date='2026-01-27' WHERE company_id=?",company.getId());assertThat(service.apply(company.getId(),request)).containsEntry("added",0);assertThat(jdbc.queryForObject("SELECT name FROM public.holidays WHERE company_id=?",String.class,company.getId())).isEqualTo("Company observance");}
 @Test void matchingCustomHolidayIsPreservedAndTracked(){jdbc.update("INSERT INTO public.holidays(name,start_date,end_date,company_id,is_active,recurring) VALUES('Mahatma Gandhi Jayanti','2026-10-01','2026-10-01',?,true,false)",company.getId());assertThat(service.apply(company.getId(),request("India",2026,false,"GANDHI_JAYANTI"))).containsEntry("added",0).containsEntry("skipped",1);assertThat(count()).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT start_date FROM public.holidays WHERE company_id=?",LocalDate.class,company.getId())).isEqualTo(LocalDate.of(2026,10,1));}
 @Test void variableDatesNeedExplicitConfirmation(){assertThatThrownBy(()->service.apply(company.getId(),request("UAE",2026,false,"EID_FITR"))).hasMessageContaining("Confirm");assertThat(count()).isZero();assertThat(service.apply(company.getId(),request("UAE",2026,true,"EID_FITR"))).containsEntry("added",1);assertThat(jdbc.queryForObject("SELECT dates_confirmed FROM public.holiday_catalog_imports WHERE company_id=?",Boolean.class,company.getId())).isTrue();}
 @Test void futureYearsNeverReuseFestivalDates(){var future=service.preview(company.getId(),"UAE",2027);assertThat(future.partial()).isTrue();assertThat(future.entries()).hasSize(2).allSatisfy(entry->assertThat(entry.startDate().getYear()).isEqualTo(2027));assertThatThrownBy(()->service.apply(company.getId(),request("UAE",2027,true,"EID_FITR"))).hasMessageContaining("Preview");assertThat(count()).isZero();}
 @Test void unknownCountriesUseCustomHolidayFlow(){var preview=service.preview(company.getId(),"Canada",2026);assertThat(preview.entries()).isEmpty();assertThat(preview.message()).contains("custom");assertThatThrownBy(()->service.apply(company.getId(),request("Canada",2026,false,"NEW_YEAR"))).hasMessageContaining("supported");}
 @Test void foreignCompanyCannotImport(){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("scoped-admin",null,List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,99L,UserRole.AccessScope.BRANCH,List.of(99L)));assertThatThrownBy(()->service.apply(company.getId(),request("India",2026,false,"REPUBLIC_DAY"))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThat(count()).isZero();}
 @Test void invalidYearsKeysAndSchemasAreRejected(){assertThatThrownBy(()->service.preview(company.getId(),"India",2025)).hasMessageContaining("year");assertThatThrownBy(()->service.apply(company.getId(),request("India",2026,false,"UNKNOWN_KEY"))).hasMessageContaining("Preview");company.setSchemaName("bad;schema");em.flush();assertThatThrownBy(()->service.apply(company.getId(),request("India",2026,false,"REPUBLIC_DAY"))).hasMessageContaining("workspace");assertThat(count()).isZero();}
 @Test void repeatedKeyCannotCreateDuplicates(){assertThat(service.apply(company.getId(),request("India",2026,false,"REPUBLIC_DAY","REPUBLIC_DAY"))).containsEntry("added",1);assertThat(count()).isEqualTo(1);}
}
