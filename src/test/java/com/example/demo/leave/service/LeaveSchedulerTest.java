package com.example.demo.leave.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import static com.example.demo.leave.entity.LeaveType.AccrualPostingTiming.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveSchedulerTest {

    @Mock private AvailableLeaveRepository availableLeaveRepository;
    @Mock private LeaveTypeRepository leaveTypeRepository;
    @Mock private LeaveAccrualService leaveAccrualService;
    @Mock private CompanyRepository companyRepository;

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void accrualProcessesPreviousMonthForEveryActiveTenantAndClearsContext() {
        Company goods = company(55L, "the_goods_collective");
        Company achira = company(12L, "achira_clinics");
        List<String> processedSchemas = new ArrayList<>();
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(goods, achira));
        when(leaveAccrualService.processMonthlyAccrual(LocalDate.of(2026, 8, 31), END_OF_MONTH)).thenAnswer(invocation -> {
            processedSchemas.add(TenantContext.getTenant());
            return 1;
        });

        scheduler().runMonthlyAccrualCatchUp(LocalDate.of(2026, 9, 8));

        verify(leaveAccrualService, times(2)).processMonthlyAccrual(LocalDate.of(2026, 8, 31), END_OF_MONTH);
        assertEquals(List.of("the_goods_collective", "achira_clinics"), processedSchemas);
        assertEquals("public", TenantContext.getTenant());
    }

    @Test
    void oneTenantFailureDoesNotBlockRemainingTenants() {
        Company failing = company(1L, "failing_tenant");
        Company healthy = company(2L, "healthy_tenant");
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(failing, healthy));
        when(leaveAccrualService.processMonthlyAccrual(LocalDate.of(2026, 8, 31), END_OF_MONTH))
                .thenThrow(new IllegalStateException("database unavailable"))
                .thenReturn(5);

        scheduler().runMonthlyAccrualCatchUp(LocalDate.of(2026, 9, 2));

        verify(leaveAccrualService, times(2)).processMonthlyAccrual(LocalDate.of(2026, 8, 31), END_OF_MONTH);
        assertEquals("public", TenantContext.getTenant());
    }

    @Test
    void companyWithoutSchemaIsSkipped() {
        Company missingSchema = company(3L, " ");
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(missingSchema));

        scheduler().runMonthlyAccrualCatchUp(LocalDate.of(2026, 9, 8));

        verifyNoInteractions(leaveAccrualService);
        assertEquals("public", TenantContext.getTenant());
    }

    private LeaveScheduler scheduler() {
        return new LeaveScheduler(availableLeaveRepository, leaveTypeRepository, leaveAccrualService, companyRepository);
    }

    @Test
    void startupCatchesUpWithoutWaitingForMidnight() {
        Company healthy = company(2L, "healthy_tenant");
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(healthy));
        scheduler().onApplicationReady();
        verify(leaveAccrualService).processMonthlyAccrual(java.time.YearMonth.now().minusMonths(1).atEndOfMonth(), END_OF_MONTH);
        verify(leaveAccrualService).processMonthlyAccrual(java.time.YearMonth.now().atDay(1), START_OF_MONTH);
    }

    @Test
    void periodicCatchUpWaitsForApplicationReadyAndThenRetries() {
        LeaveScheduler scheduler = scheduler();
        scheduler.periodicAccrualCatchUp();
        verifyNoInteractions(companyRepository, leaveAccrualService);
        Company healthy = company(2L, "healthy_tenant");
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(healthy));
        scheduler.onApplicationReady();
        scheduler.periodicAccrualCatchUp();
        verify(leaveAccrualService, times(2)).processMonthlyAccrual(java.time.YearMonth.now().minusMonths(1).atEndOfMonth(), END_OF_MONTH);
        verify(leaveAccrualService, times(2)).processMonthlyAccrual(java.time.YearMonth.now().atDay(1), START_OF_MONTH);
    }

    @Test
    void catchUpRestoresExistingTenantContext() {
        TenantContext.setTenant("original_tenant");
        Company healthy = company(2L, "healthy_tenant");
        when(companyRepository.findAllHeadOfficesActivePublic()).thenReturn(List.of(healthy));
        scheduler().runMonthlyAccrualCatchUp(LocalDate.of(2026, 9, 8));
        assertEquals("original_tenant", TenantContext.getTenant());
    }

    private Company company(Long id, String schema) {
        Company company = mock(Company.class);
        when(company.getSchemaName()).thenReturn(schema);
        lenient().when(company.getId()).thenReturn(id);
        return company;
    }
}
