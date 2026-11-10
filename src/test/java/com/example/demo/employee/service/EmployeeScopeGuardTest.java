package com.example.demo.employee.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class EmployeeScopeGuardTest {
    @Mock EmployeeRepository employees;
    @InjectMocks EmployeeService service;
    AutoCloseable mocks;
    Employee employee;
    @BeforeEach void setup() {
        mocks=MockitoAnnotations.openMocks(this);
        Company company=new Company(); company.setId(2L);
        Department department=new Department(); department.setId(20L);
        User user=new User(); user.setId(5L);
        employee=new Employee(); employee.setId(7L); employee.setCompany(company);
        employee.setDepartment(department); employee.setUser(user);
        when(employees.findById(7L)).thenReturn(Optional.of(employee));
    }
    @AfterEach void close() throws Exception { AccessScopeContext.clear(); mocks.close(); }
    @Test void branchCannotReadOrMutateAnotherCompanyEmployeeById() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,1L,UserRole.AccessScope.BRANCH,List.of(1L)));
        assertThatThrownBy(() -> service.getById(7L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.doRestore(7L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.doDelete(7L)).isInstanceOf(ResourceNotFoundException.class);
        verify(employees,never()).save(any());
    }
    @Test void companyScopeAllowsItsEmployee() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,2L,UserRole.AccessScope.BRANCH,List.of(2L)));
        assertThat(service.requireAccessibleEmployee(7L)).isSameAs(employee);
    }
    @Test void departmentScopeRejectsOtherAndMissingDepartments() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,2L,UserRole.AccessScope.DEPARTMENT,List.of(2L),21L));
        assertThatThrownBy(() -> service.requireAccessibleEmployee(7L)).isInstanceOf(ResourceNotFoundException.class);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,2L,UserRole.AccessScope.DEPARTMENT,List.of(2L)));
        assertThatThrownBy(() -> service.requireAccessibleEmployee(7L)).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void selfScopeRequiresMatchingLinkedUser() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(6L,2L,UserRole.AccessScope.SELF,List.of(2L)));
        assertThatThrownBy(() -> service.requireAccessibleEmployee(7L)).isInstanceOf(ResourceNotFoundException.class);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,2L,UserRole.AccessScope.SELF,List.of(2L)));
        assertThat(service.requireAccessibleEmployee(7L)).isSameAs(employee);
    }
    @Test void enterpriseCanAccessItsBranchesButNotForeignCompanies() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,1L,UserRole.AccessScope.ENTERPRISE,List.of(1L,2L)));
        assertThat(service.requireAccessibleEmployee(7L)).isSameAs(employee);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(5L,1L,UserRole.AccessScope.ENTERPRISE,List.of(1L,3L)));
        assertThatThrownBy(() -> service.requireAccessibleEmployee(7L)).isInstanceOf(ResourceNotFoundException.class);
    }
}
