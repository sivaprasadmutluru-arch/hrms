package com.example.demo.employee.service;

import com.example.demo.employee.entity.*;
import com.example.demo.employee.repository.*;
import com.example.demo.base.entity.Company;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportingManagerServiceTest {
    EmployeeRepository employees = mock(EmployeeRepository.class);
    EmployeeWorkInformationRepository profiles = mock(EmployeeWorkInformationRepository.class);
    ReportingManagerService service = new ReportingManagerService(employees, profiles);
    Employee person(long id, long company) {
        Employee e = new Employee(); e.setId(id); e.setActive(true);
        Company c = new Company(); c.setId(company); e.setCompany(c); return e;
    }
    @Test void profileManagerOverridesStaleEmployeeManager() {
        Employee e = person(1,1), old = person(2,1), current = person(3,1);
        e.setReportingManager(old);
        EmployeeWorkInformation w = new EmployeeWorkInformation(); w.setReportingManager(current);
        when(profiles.findByEmployeeId(1L)).thenReturn(Optional.of(w));
        assertSame(current, service.resolve(e));
    }
    @Test void explicitlyClearedProfileDoesNotRestoreOldManager() {
        Employee e = person(1,1); e.setReportingManager(person(2,1));
        when(profiles.findByEmployeeId(1L)).thenReturn(Optional.of(new EmployeeWorkInformation()));
        assertNull(service.resolve(e));
    }
    @Test void legacyEmployeeWithoutProfileKeepsManager() {
        Employee e = person(1,1), m = person(2,1); e.setReportingManager(m);
        assertSame(m, service.resolve(e));
    }
    @Test void assignmentSynchronisesBothRecordsAndCanClear() {
        Employee e = person(1,1), m = person(2,1);
        EmployeeWorkInformation w = new EmployeeWorkInformation();
        when(employees.findById(2L)).thenReturn(Optional.of(m));
        when(profiles.findByEmployeeId(1L)).thenReturn(Optional.of(w));
        service.assign(e,2L); assertSame(m,e.getReportingManager()); assertSame(m,w.getReportingManager());
        service.assign(e,null); assertNull(e.getReportingManager()); assertNull(w.getReportingManager());
    }
    @Test void rejectsSelfCycleAndOtherCompany() {
        Employee e = person(1,1), m = person(2,1), other = person(3,2);
        when(employees.findById(1L)).thenReturn(Optional.of(e));
        when(employees.findById(2L)).thenReturn(Optional.of(m));
        when(employees.findById(3L)).thenReturn(Optional.of(other));
        assertThrows(BadRequestException.class, () -> service.assign(e,1L));
        m.setReportingManager(e);
        assertThrows(BadRequestException.class, () -> service.assign(e,2L));
        assertThrows(BadRequestException.class, () -> service.assign(e,3L));
    }
}
