package com.example.demo.biometric.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.biometric.entity.BiometricDevice;
import com.example.demo.biometric.repository.BiometricDeviceRepository;
import com.example.demo.biometric.repository.BiometricEmployeeRepository;
import com.example.demo.biometric.repository.CosecAttendanceArgumentsRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiometricServiceTest {

    @Mock BiometricDeviceRepository biometricDeviceRepository;
    @Mock BiometricEmployeeRepository biometricEmployeeRepository;
    @Mock CosecAttendanceArgumentsRepository cosecAttendanceArgumentsRepository;
    @Mock CompanyRepository companyRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock AdmsTenantResolver admsTenantResolver;

    @InjectMocks BiometricService biometricService;

    @Test
    void pushOnlyDeviceWithoutHeartbeatShowsWaitingForDevice() {
        BiometricDevice device = new BiometricDevice();
        device.setId(1L);
        device.setName("Head Office");
        device.setSerialNumber("CPV2232560166");
        when(biometricDeviceRepository.findById(1L)).thenReturn(Optional.of(device));

        Map<String, Object> result = biometricService.testDeviceConnection(1L);

        assertFalse((Boolean) result.get("online"));
        assertFalse((Boolean) result.get("testable"));
        assertEquals("WAITING_FOR_DEVICE", result.get("status"));
    }
}
