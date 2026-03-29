package com.example.demo.biometric.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.biometric.entity.BiometricDevice;
import com.example.demo.biometric.entity.BiometricEmployee;
import com.example.demo.biometric.entity.CosecAttendanceArguments;
import com.example.demo.biometric.repository.BiometricDeviceRepository;
import com.example.demo.biometric.repository.BiometricEmployeeRepository;
import com.example.demo.biometric.repository.CosecAttendanceArgumentsRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/biometric")
@RequiredArgsConstructor
@Tag(name = "Biometric")
public class BiometricController {

    private final BiometricDeviceRepository biometricDeviceRepository;
    private final BiometricEmployeeRepository biometricEmployeeRepository;
    private final CosecAttendanceArgumentsRepository cosecAttendanceArgumentsRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    // ---- Biometric Devices ----

    @GetMapping("/devices")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<BiometricDevice>> listDevices(
            @RequestParam(required = false) Long companyId) {
        if (companyId != null) {
            return ResponseEntity.ok(biometricDeviceRepository.findByCompanyId(companyId));
        }
        return ResponseEntity.ok(biometricDeviceRepository.findAll());
    }

    @PostMapping("/devices")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<BiometricDevice> createDevice(@RequestBody BiometricDevice device) {
        if (device.getCompany() != null && device.getCompany().getId() != null) {
            device.setCompany(companyRepository.getReferenceById(device.getCompany().getId()));
        }
        return ResponseEntity.ok(biometricDeviceRepository.save(device));
    }

    @PutMapping("/devices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<BiometricDevice> updateDevice(
            @PathVariable Long id, @RequestBody BiometricDevice updated) {
        BiometricDevice device = biometricDeviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BiometricDevice", id));
        device.setName(updated.getName());
        device.setMachineType(updated.getMachineType());
        device.setMachineIp(updated.getMachineIp());
        device.setPort(updated.getPort());
        device.setZkPassword(updated.getZkPassword());
        device.setBioUsername(updated.getBioUsername());
        device.setBioPassword(updated.getBioPassword());
        device.setAnvizRequestId(updated.getAnvizRequestId());
        device.setApiUrl(updated.getApiUrl());
        device.setApiKey(updated.getApiKey());
        device.setApiSecret(updated.getApiSecret());
        device.setApiToken(updated.getApiToken());
        device.setApiExpires(updated.getApiExpires());
        device.setLive(updated.isLive());
        device.setScheduler(updated.isScheduler());
        device.setSchedulerDuration(updated.getSchedulerDuration());
        device.setLastFetchDate(updated.getLastFetchDate());
        device.setLastFetchTime(updated.getLastFetchTime());
        device.setDeviceDirection(updated.getDeviceDirection());
        if (updated.getCompany() != null && updated.getCompany().getId() != null) {
            device.setCompany(companyRepository.getReferenceById(updated.getCompany().getId()));
        } else {
            device.setCompany(null);
        }
        return ResponseEntity.ok(biometricDeviceRepository.save(device));
    }

    @DeleteMapping("/devices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteDevice(@PathVariable Long id) {
        biometricDeviceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Biometric Employees ----

    @GetMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<BiometricEmployee>> listBiometricEmployees(
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false) Long employeeId) {
        if (deviceId != null) {
            return ResponseEntity.ok(biometricEmployeeRepository.findByDeviceId(deviceId));
        }
        if (employeeId != null) {
            return ResponseEntity.ok(biometricEmployeeRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(biometricEmployeeRepository.findAll());
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<BiometricEmployee> createBiometricEmployee(@RequestBody BiometricEmployee biometricEmployee) {
        if (biometricEmployee.getEmployee() != null && biometricEmployee.getEmployee().getId() != null) {
            biometricEmployee.setEmployee(employeeRepository.getReferenceById(biometricEmployee.getEmployee().getId()));
        }
        if (biometricEmployee.getDevice() != null && biometricEmployee.getDevice().getId() != null) {
            biometricEmployee.setDevice(biometricDeviceRepository.getReferenceById(biometricEmployee.getDevice().getId()));
        }
        return ResponseEntity.ok(biometricEmployeeRepository.save(biometricEmployee));
    }

    @PutMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<BiometricEmployee> updateBiometricEmployee(
            @PathVariable Long id, @RequestBody BiometricEmployee updated) {
        BiometricEmployee biometricEmployee = biometricEmployeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BiometricEmployee", id));
        biometricEmployee.setUid(updated.getUid());
        biometricEmployee.setRefUserId(updated.getRefUserId());
        biometricEmployee.setUserId(updated.getUserId());
        biometricEmployee.setDahuaCardNo(updated.getDahuaCardNo());
        if (updated.getEmployee() != null && updated.getEmployee().getId() != null) {
            biometricEmployee.setEmployee(employeeRepository.getReferenceById(updated.getEmployee().getId()));
        }
        if (updated.getDevice() != null && updated.getDevice().getId() != null) {
            biometricEmployee.setDevice(biometricDeviceRepository.getReferenceById(updated.getDevice().getId()));
        } else {
            biometricEmployee.setDevice(null);
        }
        return ResponseEntity.ok(biometricEmployeeRepository.save(biometricEmployee));
    }

    @DeleteMapping("/employees/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteBiometricEmployee(@PathVariable Long id) {
        biometricEmployeeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- COSEC Attendance Arguments ----

    @GetMapping("/cosec-arguments")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listCosecArguments(
            @RequestParam(required = false) Long deviceId) {
        if (deviceId != null) {
            return ResponseEntity.ok(
                    cosecAttendanceArgumentsRepository.findFirstByDeviceId(deviceId)
                            .orElse(new CosecAttendanceArguments()));
        }
        return ResponseEntity.ok(cosecAttendanceArgumentsRepository.findAll());
    }

    @PostMapping("/cosec-arguments")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<CosecAttendanceArguments> createOrUpdateCosecArguments(
            @RequestParam(required = false) Long deviceId,
            @RequestBody CosecAttendanceArguments arguments) {
        CosecAttendanceArguments existing = (deviceId != null)
                ? cosecAttendanceArgumentsRepository.findFirstByDeviceId(deviceId).orElse(arguments)
                : arguments;
        existing.setLastFetchRollOvrCount(arguments.getLastFetchRollOvrCount());
        existing.setLastFetchSeqNumber(arguments.getLastFetchSeqNumber());
        if (existing.getDevice() == null && deviceId != null) {
            existing.setDevice(biometricDeviceRepository.getReferenceById(deviceId));
        } else if (arguments.getDevice() != null && arguments.getDevice().getId() != null) {
            existing.setDevice(biometricDeviceRepository.getReferenceById(arguments.getDevice().getId()));
        }
        return ResponseEntity.ok(cosecAttendanceArgumentsRepository.save(existing));
    }
}
