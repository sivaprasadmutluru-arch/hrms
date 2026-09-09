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

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class BiometricService {

    private final BiometricDeviceRepository biometricDeviceRepository;
    private final BiometricEmployeeRepository biometricEmployeeRepository;
    private final CosecAttendanceArgumentsRepository cosecAttendanceArgumentsRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final AdmsTenantResolver admsTenantResolver;

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
        if (device.getDeviceDirection() == null) {
            device.setDeviceDirection(BiometricDevice.DeviceDirection.SYSTEM);
        }
        if (device.getMachineType() == null) {
            device.setMachineType(BiometricDevice.MachineType.ZK);
        }
        BiometricDevice saved = biometricDeviceRepository.save(device);
        // Invalidate resolver cache so the new SN is discoverable immediately
        if (saved.getSerialNumber() != null) {
            admsTenantResolver.evictCache(saved.getSerialNumber());
        }
        return saved;
    }

    public BiometricDevice updateDevice(Long id, BiometricDevice updated) {
        BiometricDevice device = biometricDeviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BiometricDevice", id));
        // Capture old SN before overwriting — needed to evict the old cache entry
        String oldSerial = device.getSerialNumber();
        device.setName(updated.getName());
        device.setMachineType(updated.getMachineType());
        device.setSerialNumber(updated.getSerialNumber());
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
        BiometricDevice saved = biometricDeviceRepository.save(device);
        // Invalidate cache for both old and new SN so ADMS routing re-resolves
        if (oldSerial != null) admsTenantResolver.evictCache(oldSerial);
        if (saved.getSerialNumber() != null) admsTenantResolver.evictCache(saved.getSerialNumber());
        return saved;
    }

    public void deleteDevice(Long id) {
        BiometricDevice device = biometricDeviceRepository.findById(id).orElse(null);
        biometricDeviceRepository.deleteById(id);
        // Invalidate resolver cache so pushes for this SN stop being routed
        if (device != null && device.getSerialNumber() != null) {
            admsTenantResolver.evictCache(device.getSerialNumber());
        }
    }

    /**
     * Best-effort SDK/LAN connectivity probe for devices configured with an IP address.
     * ADMS push-only devices initiate their own outbound connection, so their live status
     * cannot be inferred by opening port 4370 from this server.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> testDeviceConnection(Long id) {
        BiometricDevice device = biometricDeviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BiometricDevice", id));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deviceId", device.getId());
        result.put("checkedAt", java.time.Instant.now().toString());

        if (device.getSerialNumber() != null && !device.getSerialNumber().isBlank()) {
            if (device.getLastFetchDate() != null && device.getLastFetchTime() != null) {
                LocalDateTime lastContact = LocalDateTime.of(device.getLastFetchDate(), device.getLastFetchTime());
                long ageSeconds = Math.max(0, Duration.between(
                        lastContact,
                        LocalDateTime.now(ZoneId.of("Asia/Dubai"))).getSeconds());
                boolean recentlyConnected = ageSeconds <= 180;
                result.put("online", recentlyConnected);
                result.put("testable", true);
                result.put("status", recentlyConnected ? "PUSH_CONNECTED" : "PUSH_INACTIVE");
                result.put("lastContact", lastContact.toString());
                result.put("message", recentlyConnected
                        ? "Device contacted HRMS through ADMS push recently."
                        : "No ADMS contact in the last 3 minutes. Check the device cloud-server and network settings.");
                return result;
            }

            result.put("online", false);
            result.put("testable", false);
            result.put("status", "WAITING_FOR_DEVICE");
            result.put("message", "HRMS has never received an ADMS request from this serial number.");
            return result;
        }

        if (device.getMachineIp() == null || device.getMachineIp().isBlank()
                || device.getPort() == null) {
            result.put("online", false);
            result.put("testable", false);
            result.put("status", "PUSH_ONLY");
            result.put("message", "LAN test unavailable. This device is configured for ADMS push by serial number.");
            return result;
        }

        boolean connected = false;
        String error = null;
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(device.getMachineIp(), device.getPort()), 3_000);
            connected = true;
        } catch (Exception ex) {
            error = ex.getMessage();
        }

        result.put("online", connected);
        result.put("testable", true);
        result.put("status", connected ? "ONLINE" : "OFFLINE");
        result.put("message", connected
                ? "Device TCP port is reachable."
                : "Device TCP port is not reachable from this server.");
        if (error != null && !error.isBlank()) result.put("error", error);
        return result;
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
