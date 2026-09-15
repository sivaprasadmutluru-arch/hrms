package com.example.demo.leave.service;

import com.example.demo.employee.service.ReportingManagerService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ReportingManagerReviewTest {
    @Mock LeaveRequestRepository requests;
    @Mock ReportingManagerService managers;
    @InjectMocks LeaveService service;
    @AfterEach void clear() { AccessScopeContext.clear(); }
    Employee employee(long id, long userId, long companyId) {
        Employee e = new Employee(); e.setId(id); e.setActive(true);
        User u = new User(); u.setId(userId); e.setUser(u);
        Company c = new Company(); c.setId(companyId); e.setCompany(c); return e;
    }
    LeaveRequest request(Employee e) {
        LeaveRequest r = new LeaveRequest(); r.setId(10L); r.setEmployee(e); r.setCompany(e.getCompany());
        when(requests.findById(10L)).thenReturn(Optional.of(r)); return r;
    }
    void scope(long userId, long company) {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(userId,company,UserRole.AccessScope.SELF,List.of(company)));
    }
    @Test void assignedManagerCanReviewWithoutBroadAdminRole() {
        Employee e = employee(1,11,5), m = employee(2,12,5); request(e); scope(12,5);
        when(managers.resolve(e)).thenReturn(m);
        assertTrue(service.reviewAllowed(10L));
    }
    @Test void unrelatedEmployeeCannotReview() {
        Employee e = employee(1,11,5); request(e); scope(13,5);
        when(managers.resolve(e)).thenReturn(employee(2,12,5));
        assertFalse(service.reviewAllowed(10L));
    }
    @Test void selfApprovalIsDenied() {
        request(employee(1,11,5)); scope(11,5); assertFalse(service.reviewAllowed(10L));
    }
    @Test void otherCompanyIsDeniedBeforeManagerLookup() {
        request(employee(1,11,5)); scope(12,6); assertFalse(service.reviewAllowed(10L));
    }
    @Test void inactiveManagerCannotReview() {
        Employee e = employee(1,11,5), m = employee(2,12,5); m.setActive(false); request(e); scope(12,5);
        when(managers.resolve(e)).thenReturn(m); assertFalse(service.reviewAllowed(10L));
    }
}
