package com.example.demo.facedetection.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.facedetection.entity.EmployeeFaceDetection;
import com.example.demo.facedetection.entity.FaceDetection;
import com.example.demo.facedetection.repository.EmployeeFaceDetectionRepository;
import com.example.demo.facedetection.repository.FaceDetectionRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/face-detection")
@RequiredArgsConstructor
@Tag(name = "Face Detection")
public class FaceDetectionController {

    private final FaceDetectionRepository faceDetectionRepository;
    private final EmployeeFaceDetectionRepository employeeFaceDetectionRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    // ---- Face Detection Settings ----

    @GetMapping("/settings")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FaceDetection>> listSettings() {
        return ResponseEntity.ok(faceDetectionRepository.findAll());
    }

    @GetMapping("/settings/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<FaceDetection> getSettingByCompany(@PathVariable Long companyId) {
        FaceDetection fd = faceDetectionRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "FaceDetection setting not found for company: " + companyId));
        return ResponseEntity.ok(fd);
    }

    @PostMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<FaceDetection> createSetting(@RequestBody FaceDetectionRequest request) {
        FaceDetection fd = new FaceDetection();
        fd.setStart(request.isStart());
        if (request.getCompanyId() != null) {
            fd.setCompany(companyRepository.getReferenceById(request.getCompanyId()));
        }
        return ResponseEntity.ok(faceDetectionRepository.save(fd));
    }

    @PutMapping("/settings/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<FaceDetection> updateSetting(@PathVariable Long id, @RequestBody FaceDetectionRequest request) {
        FaceDetection fd = faceDetectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FaceDetection", id));
        fd.setStart(request.isStart());
        if (request.getCompanyId() != null) {
            fd.setCompany(companyRepository.getReferenceById(request.getCompanyId()));
        }
        return ResponseEntity.ok(faceDetectionRepository.save(fd));
    }

    @DeleteMapping("/settings/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteSetting(@PathVariable Long id) {
        faceDetectionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Employee Face Detection Registrations ----

    @GetMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeFaceDetection>> listEmployeeFaceDetections() {
        return ResponseEntity.ok(employeeFaceDetectionRepository.findAll());
    }

    @GetMapping("/employees/{employeeId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<EmployeeFaceDetection> getEmployeeFaceDetection(@PathVariable Long employeeId) {
        EmployeeFaceDetection efd = employeeFaceDetectionRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "EmployeeFaceDetection not found for employee: " + employeeId));
        return ResponseEntity.ok(efd);
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeFaceDetection> createEmployeeFaceDetection(
            @RequestBody EmployeeFaceDetectionRequest request) {
        EmployeeFaceDetection efd = new EmployeeFaceDetection();
        efd.setImagePath(request.getImagePath());
        if (request.getEmployeeId() != null) {
            efd.setEmployee(employeeRepository.getReferenceById(request.getEmployeeId()));
        }
        return ResponseEntity.ok(employeeFaceDetectionRepository.save(efd));
    }

    @DeleteMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteEmployeeFaceDetection(@PathVariable Long id) {
        employeeFaceDetectionRepository.deleteById(id);
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
