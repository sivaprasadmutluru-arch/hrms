package com.example.demo.employee.service;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeSearchServiceTest {
    @Mock EmployeeRepository employees;
    @InjectMocks EmployeeService service;

    @AfterEach void clearScope() { AccessScopeContext.clear(); }

    @Test void selfScopedSearchDoesNotReturnAnUnmatchedEmployee() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(
                7L, 5L, UserRole.AccessScope.SELF, List.of(5L)));
        Employee self = new Employee();
        self.setId(11L);
        self.setFirstName("Manikanta");
        self.setEmail("manikanta@example.com");
        when(employees.findByUserId(7L)).thenReturn(Optional.of(self));

        assertEquals(0, service.getAll(PageRequest.of(0, 8), null, true, "different").getTotalElements());
        verify(employees).findByUserId(7L);
    }

    @Test void excessivelyLongSearchTextIsRejected() {
        assertThrows(BadRequestException.class, () ->
                service.getAll(PageRequest.of(0, 8), null, true, "x".repeat(81)));
    }
}
