package com.example.demo.biometric.service;

import com.example.demo.biometric.entity.*;
import com.example.demo.biometric.repository.*;
import com.example.demo.attendance.entity.*;
import com.example.demo.attendance.repository.*;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.base.entity.Company;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AdmsPunchRetentionTest {
    @Mock BiometricDeviceRepository deviceRepo;
    @Mock BiometricEmployeeRepository mappingRepo;
    @Mock BiometricPunchReceiptRepository receipts;
    @Mock AttendanceRepository attendanceRepository;
    @Mock AttendanceActivityRepository activityRepository;
    @Mock AttendanceService attendanceService;
    @InjectMocks AdmsService service;
    @Test void storesEveryEventButNotExactRetransmissions() {
        Company company=mock(Company.class); when(company.isHeadOffice()).thenReturn(true); when(company.getId()).thenReturn(6L);
        Employee employee=new Employee(); employee.setId(34L); employee.setCompany(company);
        var device=new BiometricDevice(); device.setId(2L); device.setName("Branch"); device.setCompany(company);
        var mapping=new BiometricEmployee(); mapping.setUserId("25"); mapping.setEmployee(employee);
        when(deviceRepo.lockActiveDevice("TEST")).thenReturn(Optional.of(device));
        when(mappingRepo.findByDeviceIdAndIsActiveTrue(2L)).thenReturn(List.of(mapping));
        var stored=new HashMap<String,BiometricPunchReceipt>();
        when(receipts.findByFingerprint(anyString())).thenAnswer(call->Optional.ofNullable(stored.get(call.getArgument(0))));
        when(receipts.save(any())).thenAnswer(call->{ BiometricPunchReceipt r=call.getArgument(0); stored.put(r.getFingerprint(),r); return r; });
        var activities=new ArrayList<AttendanceActivity>();
        when(activityRepository.findByEmployeeIdAndAttendanceDate(anyLong(),any())).thenAnswer(call->new ArrayList<>(activities));
        when(activityRepository.save(any())).thenAnswer(call->{ AttendanceActivity a=call.getArgument(0); if(!activities.contains(a))activities.add(a); return a; });
        var daily=new HashMap<java.time.LocalDate,Attendance>();
        when(attendanceRepository.findByEmployeeIdAndAttendanceDate(anyLong(),any())).thenAnswer(call->Optional.ofNullable(daily.get(call.getArgument(1))));
        when(attendanceRepository.save(any())).thenAnswer(call->{ Attendance a=call.getArgument(0); a.setId(1L); daily.put(a.getAttendanceDate(),a); return a; });
        String batch="25\t2026-09-16 12:00:00\t0\n25\t2026-09-16 12:00:10\t0\n25\t2026-09-16 13:00:00\t1\n25\t2026-09-16 14:00:00\t0\n25\t2026-09-16 18:00:00\t1";
        service.processAttlogPush("TEST",batch);
        service.processAttlogPush("TEST",batch);
        assertEquals(5,stored.size());
        assertEquals(2,activities.size());
        assertEquals(1,daily.size());
        assertTrue(stored.values().stream().allMatch(r->"PROCESSED".equals(r.getProcessingState())));
    }
}
