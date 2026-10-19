package com.example.demo.carr.service;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarrKpiConfigurationTest {
    @Mock CarrRecordRepository recordRepo;@Mock CarrKpiRepository kpiRepo;@Mock CarrAuditEventRepository auditRepo;
    @Mock CarrResponsibilityRepository responsibilityRepo;@Mock CarrRewardRepository rewardRepo;
    @Mock EmployeeRepository employeeRepo;@Mock CarrKpiEngine engine;
    @InjectMocks CarrService service;
    CarrRecord record=new CarrRecord();Employee employee=new Employee();Company company=new Company();
    LocalDate from=LocalDate.now().withDayOfMonth(1),to=LocalDate.now();
    Authentication auth(String role){User u=new User();u.setId(1L);u.setUsername("reviewer");return new UsernamePasswordAuthenticationToken(new UserPrincipal(u),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)));}
    @BeforeEach void setup(){CompanyContext.set(10L);company.setId(10L);employee.setId(20L);employee.setCompany(company);record.setId(40L);record.setCompany(company);record.setEmployee(employee);record.setTitle("Finance Manager");record.setEffectiveFrom(from);record.setEffectiveTo(to);when(recordRepo.findForUpdate(40L,10L)).thenReturn(Optional.of(record));}
    @AfterEach void clear(){CompanyContext.clear();}
    KpiRequest kpi(Long id,String name,int weight,String unit){return new KpiRequest(id,name,CarrKpi.Type.KPI,CarrKpi.Direction.INCREASE,new BigDecimal("95"),null,unit,weight,to,"MANUAL",null,"Monthly","Completed / assigned × 100",null,true);}
    KpiConfigurationRequest config(KpiRequest... rows){return new KpiConfigurationRequest(List.of(rows),from,to,null);}
    @Test void invalidWeightsNamesUnitsAndForeignKpiIdsCannotBeSaved(){
        assertThatThrownBy(()->service.configureKpis(40L,config(kpi(null,"Delivery",99,"%")),auth("HR_MANAGER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("100");
        assertThatThrownBy(()->service.configureKpis(40L,config(kpi(null,"Delivery",50,"%"),kpi(null,"delivery",50,"%")),auth("HR_MANAGER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("Duplicate");
        assertThatThrownBy(()->service.configureKpis(40L,config(kpi(null,"Delivery",100,"")),auth("HR_MANAGER"))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.configureKpis(40L,config(kpi(999L,"Foreign",100,"%")),auth("HR_MANAGER"))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
    }
    @Test void approvedKpisAreProtectedAndCrossCompanyRecordsAreUnavailable(){record.setStatus(CarrStatus.APPROVED);assertThatThrownBy(()->service.configureKpis(40L,config(kpi(null,"Delivery",100,"%")),auth("HR_MANAGER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("draft or returned");assertThatThrownBy(()->service.configureKpis(999L,config(kpi(null,"Delivery",100,"%")),auth("HR_MANAGER"))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);verify(kpiRepo,never()).save(any());}
    @Test void normalEmployeesCannotOverwriteActualsEvenIfTheyOwnTheRecord(){record.setStatus(CarrStatus.PUBLISHED);when(employeeRepo.findByUserId(1L)).thenReturn(Optional.of(employee));assertThatThrownBy(()->service.updateActual(40L,1L,new ActualValueRequest(BigDecimal.ZERO,"Verified source"),auth("EMPLOYEE"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("assigned manager or HR");verify(kpiRepo,never()).save(any());}
    @Test void validConfigurationRetainsIdsAndRecordsAuditWithoutReplacingTasks(){
        CarrKpi existing=new CarrKpi();existing.setId(60L);existing.setCarr(record);existing.setName("Delivery");
        when(kpiRepo.findByCarrIdOrderById(40L)).thenReturn(List.of(existing));
        var result=service.configureKpis(40L,config(kpi(60L,"Delivery",100,"%")),auth("HR_MANAGER"));
        assertThat(result.kpis()).hasSize(1);assertThat(result.kpis().getFirst().id()).isEqualTo(60L);assertThat(result.resultScore()).isNull();
        verify(auditRepo).save(argThat(a->a.getAction().equals("KPI_CONFIGURATION_SAVED")&&a.getDetails().contains("period")&&a.getDetails().contains("target=95")));
        verify(responsibilityRepo,never()).deleteAll(anyIterable());
    }
}
