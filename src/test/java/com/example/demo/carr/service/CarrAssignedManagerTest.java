package com.example.demo.carr.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
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
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarrAssignedManagerTest {
    @Mock CarrRecordRepository recordRepo;
    @Mock CarrKpiRepository kpiRepo;
    @Mock CarrResponsibilityRepository responsibilityRepo;
    @Mock CarrRewardRepository rewardRepo;
    @Mock CarrAuditEventRepository auditRepo;
    @Mock EmployeeRepository employeeRepo;
    @InjectMocks CarrService service;
    Company company;Employee manager;CarrRecord record;
    @BeforeEach void setup(){
        CompanyContext.set(1L);company=new Company();company.setId(1L);
        manager=employee(4L);record=record(40L,employee(2L));record.setManager(manager);record.setStatus(CarrStatus.SUBMITTED);
        lenient().when(employeeRepo.findByUserId(41L)).thenReturn(Optional.of(manager));
        lenient().when(recordRepo.findForUpdate(40L,1L)).thenReturn(Optional.of(record));
    }
    @AfterEach void clear(){CompanyContext.clear();}
    Employee employee(Long id){var e=new Employee();e.setId(id);e.setCompany(company);e.setFirstName("Synthetic "+id);return e;}
    CarrRecord record(Long id,Employee employee){var r=new CarrRecord();r.setId(id);r.setCompany(company);r.setEmployee(employee);return r;}
    Authentication auth(String role){var user=new User();user.setId(41L);user.setUsername("synthetic-manager");return new UsernamePasswordAuthenticationToken(new UserPrincipal(user),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)));}
    @Test void departmentManagerCanApproveOnlyTheirAssignedRecord(){
        var response=service.approve(40L,auth("DEPARTMENT_MANAGER"));
        assertThat(response.status()).isEqualTo(CarrStatus.ACKNOWLEDGEMENT_PENDING);
        verify(auditRepo).save(argThat(a->a.getAction().equals("APPROVED")));
    }
    @Test void teamLeadCanReviewTheirAssignedRecord(){
        assertThat(service.approve(40L,auth("TEAM_LEAD")).status()).isEqualTo(CarrStatus.ACKNOWLEDGEMENT_PENDING);
    }
    @Test void unrelatedManagerCannotViewOrApproveRecord(){
        record.setManager(employee(5L));
        assertThatThrownBy(()->service.record(40L,auth("DEPARTMENT_MANAGER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("own or directly assigned");
        assertThatThrownBy(()->service.approve(40L,auth("DEPARTMENT_MANAGER"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("assigned manager");
        verify(recordRepo,never()).save(any());
    }
    @Test void employeeRoleDoesNotGainApprovalFromReportingAssignmentAlone(){
        assertThatThrownBy(()->service.approve(40L,auth("EMPLOYEE"))).isInstanceOf(ResponseStatusException.class);
        verify(recordRepo,never()).save(any());
    }
    @Test void managerListingIncludesOwnAndAssignedRecordsWithoutCompanyWideRead(){
        var own=record(41L,manager);
        when(recordRepo.findByCompanyIdAndEmployeeIdOrderByUpdatedAtDesc(1L,4L)).thenReturn(List.of(own));
        when(recordRepo.findByCompanyIdAndManagerIdOrderByUpdatedAtDesc(1L,4L)).thenReturn(List.of(record));
        assertThat(service.records(auth("DEPARTMENT_MANAGER"))).extracting(r->r.id()).containsExactly(41L,40L);
        verify(recordRepo,never()).findByCompanyIdOrderByUpdatedAtDesc(any());
    }
}
