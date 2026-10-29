package com.example.demo.onboarding.service;

import com.example.demo.onboarding.entity.ProbationPolicy;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class ProbationEligibilityTest {
    @Test void cohortIsOptInAndDoesNotIncludeEarlierJoiners() {
        var eligibility = new ProbationEligibility(null, null, null);
        var policy = new ProbationPolicy(); policy.setEffectiveFrom(LocalDate.of(2026, 1, 1));
        assertFalse(eligibility.applies(policy, LocalDate.of(2026, 2, 1)));
        policy.setEnabled(true);
        assertTrue(eligibility.applies(policy, LocalDate.of(2026, 1, 1)));
        assertFalse(eligibility.applies(policy, LocalDate.of(2025, 12, 31)));
        assertFalse(eligibility.applies(policy, null));
    }

    @Test void upfrontProrationUsesConfirmationInsteadOfJoiningDate() {
        var type = new com.example.demo.leave.entity.LeaveType(); type.setTotalDays(30);
        type.setMidYearJoinerMode(com.example.demo.leave.entity.LeaveType.MidYearJoinerMode.AUTO_PRORATA);
        assertEquals(15.12, ProbationConfirmationService.upfrontDays(type, LocalDate.of(2026, 7, 1),
                com.example.demo.leave.service.LeavePeriodResolver.containing(type, LocalDate.of(2026, 7, 1))));
    }

    @Test void monthlyEntitlementWaitsForRecordedConfirmationAndKeepsItsEffectiveDate() {
        var policies = org.mockito.Mockito.mock(com.example.demo.onboarding.repository.ProbationPolicyRepository.class);
        var work = org.mockito.Mockito.mock(com.example.demo.employee.repository.EmployeeWorkInformationRepository.class);
        var confirmations = org.mockito.Mockito.mock(com.example.demo.onboarding.repository.ProbationConfirmationRepository.class);
        var eligibility = new ProbationEligibility(policies, work, confirmations);
        var employee = new com.example.demo.employee.entity.Employee(); employee.setId(2L);
        var company = new com.example.demo.base.entity.Company(); company.setId(1L); employee.setCompany(company);
        employee.setDateJoining(LocalDate.of(2026, 1, 1));
        var policy = new ProbationPolicy(); policy.setEnabled(true); policy.setEffectiveFrom(employee.getDateJoining());
        org.mockito.Mockito.when(policies.findByCompanyId(1L)).thenReturn(java.util.Optional.of(policy));
        assertEquals(LocalDate.MAX, eligibility.leaveStartsOn(employee));
        var confirmation = new com.example.demo.onboarding.entity.ProbationConfirmation();
        confirmation.setConfirmedOn(LocalDate.of(2026, 7, 1));
        org.mockito.Mockito.when(confirmations.findByEmployeeId(2L)).thenReturn(java.util.Optional.of(confirmation));
        policy.setEnabled(false);
        employee.setDateJoining(LocalDate.of(2026, 3, 1));
        assertEquals(LocalDate.of(2026, 7, 1), eligibility.leaveStartsOn(employee));
    }
}
