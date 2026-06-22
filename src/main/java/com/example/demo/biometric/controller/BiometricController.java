package com.example.demo.biometric.controller;

import com.example.demo.biometric.entity.BiometricDevice;
import com.example.demo.biometric.entity.BiometricEmployee;
import com.example.demo.biometric.entity.CosecAttendanceArguments;
import com.example.demo.biometric.service.BiometricService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/biometric")
@RequiredArgsConstructor
@Tag(name = "Biometric")
public class BiometricController {

    private final BiometricService biometricService;

    // ---- Biometric Devices ----

    @GetMapping("/devices")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BiometricDevice>> listDevices(
            @RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(biometricService.listDevices(companyId));
    }

    @PostMapping("/devices")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BiometricDevice> createDevice(@RequestBody BiometricDevice device) {
        System.out.println("CREATING DEVICE: name=" + device.getName() + " SN=" + device.getSerialNumber());
        return ResponseEntity.ok(biometricService.createDevice(device));
    }

    @PutMapping("/devices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BiometricDevice> updateDevice(
            @PathVariable Long id, @RequestBody BiometricDevice updated) {
        return ResponseEntity.ok(biometricService.updateDevice(id, updated));
    }

    @DeleteMapping("/devices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteDevice(@PathVariable Long id) {
        biometricService.deleteDevice(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Biometric Employees ----

    @GetMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BiometricEmployee>> listBiometricEmployees(
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(biometricService.listBiometricEmployees(deviceId, employeeId));
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BiometricEmployee> createBiometricEmployee(@RequestBody BiometricEmployee biometricEmployee) {
        return ResponseEntity.ok(biometricService.createBiometricEmployee(biometricEmployee));
    }

    @PutMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BiometricEmployee> updateBiometricEmployee(
            @PathVariable Long id, @RequestBody BiometricEmployee updated) {
        return ResponseEntity.ok(biometricService.updateBiometricEmployee(id, updated));
    }

    @DeleteMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteBiometricEmployee(@PathVariable Long id) {
        biometricService.deleteBiometricEmployee(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- COSEC Attendance Arguments ----

    @GetMapping("/cosec-arguments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> listCosecArguments(
            @RequestParam(required = false) Long deviceId) {
        return ResponseEntity.ok(biometricService.listCosecArguments(deviceId));
    }

    @PostMapping("/cosec-arguments")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<CosecAttendanceArguments> createOrUpdateCosecArguments(
            @RequestParam(required = false) Long deviceId,
            @RequestBody CosecAttendanceArguments arguments) {
        return ResponseEntity.ok(biometricService.createOrUpdateCosecArguments(deviceId, arguments));
    }
}
