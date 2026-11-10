package com.example.demo.auth.controller;
import com.example.demo.auth.service.PositionAccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.Map;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/companies/{companyId}/job-positions/{positionId}/access")
@PreAuthorize("isAuthenticated()")
public class PositionAccessController {
    private final PositionAccessService access;
    public record Request(@NotNull PositionAccessService.Profile profile,@Min(0) long version) {}
    @GetMapping public Map<String,Object> get(@PathVariable Long companyId,@PathVariable Long positionId) { return access.get(companyId,positionId); }
    @PutMapping public Map<String,Object> save(@PathVariable Long companyId,@PathVariable Long positionId,@Valid @RequestBody Request request) {
        return access.save(companyId,positionId,request.profile(),request.version());
    }
}
