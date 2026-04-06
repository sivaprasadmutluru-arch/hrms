package com.example.demo.facedetection.controller;

import com.example.demo.facedetection.entity.EmployeeFaceDetection;
import com.example.demo.facedetection.entity.FaceDetection;
import com.example.demo.facedetection.service.FaceDetectionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/face-detection")
@RequiredArgsConstructor
@Tag(name = "Face Detection")
public class FaceDetectionController {

    private final FaceDetectionService faceDetectionService;

    // ---- Face Detection Settings ----

    @GetMapping("/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FaceDetection>> listSettings() {
        return ResponseEntity.ok(faceDetectionService.listSettings());
    }

    @GetMapping("/settings/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FaceDetection> getSettingByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(faceDetectionService.getSettingByCompany(companyId));
    }

    @PostMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<FaceDetection> createSetting(@RequestBody FaceDetectionRequest request) {
        return ResponseEntity.ok(faceDetectionService.createSetting(request.getCompanyId(), request.isStart()));
    }

    @PutMapping("/settings/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<FaceDetection> updateSetting(@PathVariable Long id, @RequestBody FaceDetectionRequest request) {
        return ResponseEntity.ok(faceDetectionService.updateSetting(id, request.getCompanyId(), request.isStart()));
    }

    @DeleteMapping("/settings/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteSetting(@PathVariable Long id) {
        faceDetectionService.deleteSetting(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Employee Face Detection Registrations ----

    @GetMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EmployeeFaceDetection>> listEmployeeFaceDetections() {
        return ResponseEntity.ok(faceDetectionService.listEmployeeFaceDetections());
    }

    @GetMapping("/employees/{employeeId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeFaceDetection> getEmployeeFaceDetection(@PathVariable Long employeeId) {
        return ResponseEntity.ok(faceDetectionService.getEmployeeFaceDetection(employeeId));
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<EmployeeFaceDetection> createEmployeeFaceDetection(
            @RequestBody EmployeeFaceDetectionRequest request) {
        return ResponseEntity.ok(
                faceDetectionService.createEmployeeFaceDetection(request.getEmployeeId(), request.getImagePath()));
    }

    @DeleteMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteEmployeeFaceDetection(@PathVariable Long id) {
        faceDetectionService.deleteEmployeeFaceDetection(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Inner request DTOs ----

    public static class FaceDetectionRequest {
        private Long companyId;
        private boolean start;

        public Long getCompanyId() { return companyId; }
        public void setCompanyId(Long companyId) { this.companyId = companyId; }
        public boolean isStart() { return start; }
        public void setStart(boolean start) { this.start = start; }
    }

    public static class EmployeeFaceDetectionRequest {
        private Long employeeId;
        private String imagePath;

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
        public String getImagePath() { return imagePath; }
        public void setImagePath(String imagePath) { this.imagePath = imagePath; }
    }
}
