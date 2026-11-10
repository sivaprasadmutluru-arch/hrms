package com.example.demo.base.controller;
import com.example.demo.base.service.StandardCompanySetup;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.Map;
@RestController @RequiredArgsConstructor
public class EmployeeSetupController {
    private final StandardCompanySetup setup;
    @GetMapping("/api/companies/{companyId}/employee-setup") @PreAuthorize("isAuthenticated()")
    public Map<String,Object> options(@PathVariable Long companyId) { return setup.options(companyId); }
}
