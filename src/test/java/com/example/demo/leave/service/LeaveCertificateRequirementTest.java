package com.example.demo.leave.service;

import com.example.demo.leave.entity.LeaveType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LeaveCertificateRequirementTest {
    @Test
    void sickLeaveExemptsOneDayAndRequiresCertificateAboveOneDay() {
        LeaveType type = new LeaveType();
        type.setName("Sick Leave");
        type.setRequireAttachment(true);
        assertFalse(LeaveService.requiresCertificate(type, 0.5));
        assertFalse(LeaveService.requiresCertificate(type, 1));
        assertTrue(LeaveService.requiresCertificate(type, 1.5));
        assertTrue(LeaveService.requiresCertificate(type, 2));
    }

    @Test
    void otherLeaveTypesKeepTheirConfiguredRequirement() {
        LeaveType type = new LeaveType();
        type.setName("Annual Leave");
        type.setRequireAttachment(false);
        assertFalse(LeaveService.requiresCertificate(type, 2));
        type.setRequireAttachment(true);
        assertTrue(LeaveService.requiresCertificate(type, 1));
    }
}
