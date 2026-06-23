package com.example.demo.profile.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.service.EmployeeService;
import com.example.demo.payroll.entity.Contract;
import com.example.demo.payroll.repository.ContractRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Mobile-facing profile endpoints.
 *
 * Contract used by the mobile app:
 *   POST /api/profile/uploadPhoto   – upload own profile photo (multipart "file")
 *   GET  /api/profile/fetchMe       – fetch own profile incl. fresh photoPath
 *
 * Previously the mobile app called these routes, which did not exist; the only
 * working endpoints were /api/ess/me/photo and /api/auth/me. As a result uploads
 * silently fell through to /api/files/profile-photo (which stores the file but
 * never persists photoPath on the employee), so fetchMe kept returning the old URL.
 *
 * This controller persists the path via EmployeeService.uploadPhoto and always
 * serves a freshly-loaded photoPath, fixing both halves of the bug.
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Profile (Mobile)")
public class ProfileController {

    private final EmployeeRepository employeeRepository;
    private final EmployeeService employeeService;
    private final ContractRepository contractRepository;

    /**
     * Upload the current user's profile photo.
     * Delegates to EmployeeService.uploadPhoto which:
     *   - deletes the previously stored photo,
     *   - stores the new file org-scoped,
     *   - sets photoPath on the employee and persists it.
     * Returns the new photoPath so the client can refresh immediately.
     */
    @PostMapping(value = "/uploadPhoto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload own profile photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) throws IOException {

        Employee emp = resolveEmployee(principal);
        String path = employeeService.uploadPhoto(emp.getId(), file);

        // Re-read the persisted entity so we return the value actually saved.
        String stored = employeeRepository.findById(emp.getId())
                .map(Employee::getPhotoPath)
                .orElse(path);

        Map<String, Object> body = new HashMap<>();
        body.put("photoPath", stored);
        body.put("photoUrl", "/api/files/" + stored);
        return ResponseEntity.ok(body);
    }

    /**
     * Fetch the current user's profile with a guaranteed-fresh photoPath.
     * Reads the employee straight from the repository (bypassing any cached DTO),
     * so it always reflects the latest stored photo.
     */
    @GetMapping("/fetchMe")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Fetch own profile (mobile)")
    public ResponseEntity<EmployeeResponse> fetchMe(@AuthenticationPrincipal UserPrincipal principal) {
        Employee emp = resolveEmployee(principal);
        Contract contract = contractRepository.findByEmployeeId(emp.getId())
                .stream().findFirst().orElse(null);
        return ResponseEntity.ok(EmployeeResponse.from(emp, contract));
    }

    private Employee resolveEmployee(UserPrincipal principal) {
        if (principal == null) {
            throw new ResourceNotFoundException("Not authenticated");
        }
        return employeeRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record linked to your user account. Contact your HR admin."));
    }
}
