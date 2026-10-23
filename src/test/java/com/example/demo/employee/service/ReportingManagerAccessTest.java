package com.example.demo.employee.service;

import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportingManagerAccessTest {
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final ReportingManagerService service = spy(new ReportingManagerService(employees,
            mock(EmployeeWorkInformationRepository.class)));

    private Employee employee(long id, Company company) {
        Employee result = new Employee();
        result.setId(id);
        result.setActive(true);
        result.setCompany(company);
        return result;
    }

    @Test void recognizesActiveDirectReportsWithinManagersCompany() {
        Company company = new Company(); company.setId(65L);
        Employee manager = employee(1, company), report = employee(2, company);
        when(employees.findByCompanyId(65L)).thenReturn(List.of(manager, report));
        doReturn(manager).when(service).resolve(report);
        assertTrue(service.hasDirectReports(manager));
        verify(service, never()).resolve(manager);
    }

    @Test void inactiveReportsAndInactiveManagersDoNotGrantAccess() {
        Company company = new Company(); company.setId(65L);
        Employee manager = employee(1, company), report = employee(2, company);
        report.setActive(false);
        when(employees.findByCompanyId(65L)).thenReturn(List.of(report));
        assertFalse(service.hasDirectReports(manager));
        manager.setActive(false);
        assertFalse(service.hasDirectReports(manager));
        assertFalse(service.hasDirectReports(null));
    }

    @Test void someoneElsesReportsDoNotGrantAccess() {
        Company company = new Company(); company.setId(65L);
        Employee manager = employee(1, company), otherManager = employee(3, company), report = employee(2, company);
        when(employees.findByCompanyId(65L)).thenReturn(List.of(report));
        doReturn(otherManager).when(service).resolve(report);
        assertFalse(service.hasDirectReports(manager));
    }
}
