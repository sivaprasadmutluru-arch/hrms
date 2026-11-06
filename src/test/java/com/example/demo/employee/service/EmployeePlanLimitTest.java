package com.example.demo.employee.service;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.base.entity.*;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.auth.service.PositionAccessService;
import com.example.demo.common.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class EmployeePlanLimitTest {
    @Mock EmployeeRepository employees;
    @Mock CompanyRepository companies;
    @Mock PositionAccessService positions;
    @Mock EntityManager entityManager;
    @InjectMocks EmployeeService service;
    AutoCloseable mocks;
    Company company=new Company(); Employee employee=new Employee();
    @BeforeEach void setup() {
        mocks=MockitoAnnotations.openMocks(this);
        org.springframework.test.util.ReflectionTestUtils.setField(service,"entityManager",entityManager);
        var org=new Organization(); org.setId(1L); org.setSubscriptionPlan(SubscriptionPlan.FREE);
        company.setId(1L); company.setOrganization(org);
        employee.setId(7L); employee.setCompany(company); employee.setActive(false);
        when(employees.findById(7L)).thenReturn(Optional.of(employee));
        when(companies.findByOrganizationId(1L)).thenReturn(List.of(company));
    }
    @AfterEach void close() throws Exception { mocks.close(); }
    @Test void purchasedSeatsAlsoLimitReactivationBelowPlanMaximum() {
        company.getOrganization().setSubscriptionPlan(SubscriptionPlan.STANDARD);
        company.getOrganization().setPurchasedSeats(10);
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(10L);
        assertThatThrownBy(() -> service.doRestore(7L)).isInstanceOf(BadRequestException.class).hasMessageContaining("10");
        verify(employees,never()).save(any());
    }
    @Test void standardPackageAllowsItsTwoHundredthEmployeeWithoutBuyingSeats() {
        company.getOrganization().setSubscriptionPlan(SubscriptionPlan.STANDARD);
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(199L);
        service.doRestore(7L); assertThat(employee.isActive()).isTrue();
    }
    @Test void standardPackageRejectsTwoHundredAndFirstEmployee() {
        company.getOrganization().setSubscriptionPlan(SubscriptionPlan.STANDARD);
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(200L);
        assertThatThrownBy(() -> service.doRestore(7L)).isInstanceOf(BadRequestException.class).hasMessageContaining("200");
        verify(employees,never()).save(any());
    }
    @Test void bulkActivationCannotBypassTheSameCapacityGuard() {
        when(employees.findAllById(List.of(7L))).thenReturn(List.of(employee));
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(15L);
        assertThatThrownBy(() -> service.bulkSetActive(List.of(7L),true)).isInstanceOf(BadRequestException.class);
        assertThat(employee.isActive()).isFalse(); verify(employees,never()).save(any());
    }
    @Test void cannotReactivateSixteenthActiveEmployee() {
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(15L);
        assertThatThrownBy(() -> service.doRestore(7L)).isInstanceOf(BadRequestException.class).hasMessageContaining("15");
        assertThat(employee.isActive()).isFalse(); verify(employees,never()).save(any());
    }
    @Test void canReactivateFifteenthEmployeeAndRepeatedRestoreDoesNotConsumeAnotherSeat() {
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(14L);
        service.doRestore(7L); assertThat(employee.isActive()).isTrue();
        when(employees.countByCompanyIdAndIsActiveTrue(1L)).thenReturn(15L);
        service.doRestore(7L); verify(employees,times(1)).countByCompanyIdAndIsActiveTrue(1L);
    }
}
