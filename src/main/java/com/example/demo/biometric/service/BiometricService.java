package com.example.demo.biometric.service;

import com.example.demo.biometric.entity.BiometricDevice;
import com.example.demo.biometric.entity.BiometricEmployee;
import com.example.demo.biometric.entity.CosecAttendanceArguments;
import com.example.demo.biometric.repository.BiometricDeviceRepository;
import com.example.demo.biometric.repository.BiometricEmployeeRepository;
import com.example.demo.biometric.repository.CosecAttendanceArgumentsRepository;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BiometricService {

    private final BiometricDeviceRepository biometricDeviceRepository;
    private final BiometricEmployeeRepository biometricEmployeeRepository;
    private final CosecAttendanceArgumentsRepository cosecAttendanceArgumentsRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    // ---- Devices ----

    @Transactional(readOnly = true)
    public List<BiometricDevice> listDevices(Long companyId) {
        if (companyId != null) {
            return biometricDeviceRepository.findByCompanyId(companyId);
        }
        return biometricDeviceRepository.findAll();
    }

    public BiometricDevice createDevice(BiometricDevice device) {
        if (device.getCompany() != null && device.getCompany().getId() != null) {
            device.setCompany(companyRepository.getReferenceById(device.getCompany().getId()));
        }
        return biometricDeviceRepository.save(device);
    }

    public BiometricDevice updateDevice(Long id, BiometricDevice updated) {
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
        return biometricDeviceRepository.save(device);
    }

    public void deleteDevice(Long id) {
        biometricDeviceRepository.deleteById(id);
    }

    // ---- Biometric Employees ----

    @Transactional(readOnly = true)
    public List<BiometricEmployee> listBiometricEmployees(Long deviceId, Long employeeId) {
        if (deviceId != null) {
            return biometricEmployeeRepository.findByDeviceId(deviceId);
        }
        if (employeeId != null) {
            return biometricEmployeeRepository.findByEmployeeId(employeeId);
        }
        return biometricEmployeeRepository.findAll();
    }

    public BiometricEmployee createBiometricEmployee(BiometricEmployee biometricEmployee) {
        if (biometricEmployee.getEmployee() != null && biometricEmployee.getEmployee().getId() != null) {
            biometricEmployee.setEmployee(employeeRepository.getReferenceById(biometricEmployee.getEmployee().getId()));
        }
        if (biometricEmployee.getDevice() != null && biometricEmployee.getDevice().getId() != null) {
            biometricEmployee.setDevice(biometricDeviceRepository.getReferenceById(biometricEmployee.getDevice().getId()));
        }
        return biometricEmployeeRepository.save(biometricEmployee);
    }

    public BiometricEmployee updateBiometricEmployee(Long id, BiometricEmployee updated) {
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
        return biometricEmployeeRepository.save(biometricEmployee);
    }

    public void deleteBiometricEmployee(Long id) {
        biometricEmployeeRepository.deleteById(id);
    }

    // ---- COSEC Attendance Arguments ----

    @Transactional(readOnly = true)
    public Object listCosecArguments(Long deviceId) {
        if (deviceId != null) {
            return cosecAttendanceArgumentsRepository.findFirstByDeviceId(deviceId)
                    .orElse(new CosecAttendanceArguments());
        }
        return cosecAttendanceArgumentsRepository.findAll();
    }

    public CosecAttendanceArguments createOrUpdateCosecArguments(Long deviceId, CosecAttendanceArguments arguments) {
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
        return cosecAttendanceArgumentsRepository.save(existing);
    }
}
