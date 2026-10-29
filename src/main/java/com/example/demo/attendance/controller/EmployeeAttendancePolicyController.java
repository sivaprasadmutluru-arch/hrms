package com.example.demo.attendance.controller;

import com.example.demo.attendance.service.EmployeeAttendancePolicyService;
import com.example.demo.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/employees/{employeeId}/attendance-policy") @RequiredArgsConstructor
public class EmployeeAttendancePolicyController {
    private final EmployeeAttendancePolicyService service;
    @GetMapping @PreAuthorize("hasAuthority('employee:view')")
    public EmployeeAttendancePolicyService.PolicyView view(@PathVariable Long employeeId) {return service.view(employeeId);}
    @PostMapping @PreAuthorize("hasAuthority('employee:edit') and hasAnyRole('SUPER_ADMIN','PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','COMPANY_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    public EmployeeAttendancePolicyService.PolicyView change(@PathVariable Long employeeId,
            @RequestBody EmployeeAttendancePolicyService.Change change, @AuthenticationPrincipal UserPrincipal principal) {
        return service.change(employeeId, change, principal.getId());
    }
}
