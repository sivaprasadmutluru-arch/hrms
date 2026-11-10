package com.example.demo.base.controller;
import com.example.demo.base.enums.OrganizationIndustry;
import com.example.demo.base.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.*;
@RestController @RequiredArgsConstructor @PreAuthorize("isAuthenticated()")
public class OrganizationTemplateController {
    private final StandardCompanySetup setup;
    private final OrganizationTemplateService templates;
    public record Request(@NotNull OrganizationIndustry industry,@NotNull OrganizationIndustry expectedIndustry) {}
    @GetMapping("/api/organization-templates") public List<Map<String,Object>> catalog() { return setup.catalog(); }
    @GetMapping("/api/companies/{companyId}/organization-template") public Map<String,Object> get(@PathVariable Long companyId) { return templates.get(companyId); }
    @PutMapping("/api/companies/{companyId}/organization-template") public Map<String,Object> apply(@PathVariable Long companyId,@Valid @RequestBody Request request) { return templates.apply(companyId,request.industry(),request.expectedIndustry()); }
}
