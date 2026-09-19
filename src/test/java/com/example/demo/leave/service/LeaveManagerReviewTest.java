package com.example.demo.leave.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.service.ReportingManagerService;
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
class LeaveManagerReviewTest {
    @Mock LeaveRequestRepository requests;
    @Mock ReportingManagerService reportingManagers;
    @InjectMocks LeaveService service;
    @AfterEach void clear() { AccessScopeContext.clear(); }
    @Test void employeeRoleManagerCanReviewDirectReport() {
        var company=new Company(); company.setId(64L);
        var employee=new Employee(); employee.setId(4L); employee.setCompany(company);
        var manager=new Employee(); manager.setId(16L); manager.setCompany(company);
        var user=new User(); user.setId(166L); manager.setUser(user);
        var request=new LeaveRequest(); request.setCompany(company); request.setEmployee(employee);
        when(requests.findById(75L)).thenReturn(Optional.of(request));
        when(reportingManagers.resolve(employee)).thenReturn(manager);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(166L,64L,UserRole.AccessScope.SELF,List.of(64L)));
        assertTrue(service.reviewAllowed(75L));
    }
    @Test void cannotReviewAnotherCompany() {
        var company=new Company(); company.setId(64L);
        var request=new LeaveRequest(); request.setCompany(company);
        when(requests.findById(75L)).thenReturn(Optional.of(request));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(166L,99L,UserRole.AccessScope.SELF,List.of(99L)));
        assertFalse(service.reviewAllowed(75L));
    }
}
