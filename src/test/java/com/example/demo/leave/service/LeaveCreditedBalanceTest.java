package com.example.demo.leave.service;

import com.example.demo.leave.dto.LeaveMapper;
import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaveCreditedBalanceTest {
    @Mock LeaveRequestRepository requests;
    @InjectMocks LeaveService service;
    private AvailableLeave balance() {
        var type = new LeaveType();
        type.setCarryforwardType(LeaveType.CarryforwardType.NO_CARRYFORWARD);
        type.setReset(true); type.setResetBased("yearly"); type.setResetMonth("1"); type.setResetDay("1");
        var balance = new AvailableLeave(); balance.setLeaveType(type);
        balance.setAvailableDays(31.0); balance.setCarryforwardDays(10.0);
        balance.setTotalLeaveDays(999.0); // stale stored total must not affect display or validation
        return balance;
    }
    @Test void nuwanDisplayAndValidationBothHaveSixDays() {
        var b = balance();
        when(requests.sumApprovedDaysForPeriod(eq(4L),eq(1L),any(),any())).thenReturn(35.0);
        double remaining = ReflectionTestUtils.invokeMethod(service,"computeRemaining",b,4L,1L,LocalDate.of(2026,9,15));
        assertEquals(6.0, remaining);
        var dto = LeaveMapper.toDTO(b,35.0);
        assertEquals(remaining,dto.totalLeaveDays()-dto.usedDays());
        assertEquals(remaining, dto.remainingDays());
        assertTrue(remaining >= 2.0);
    }
    @Test void futureNoCarryoverStillClearsCreditAtReset() {
        var b=balance(); b.updateCarryforward(); assertEquals(0.0,b.getCarryforwardDays());
    }
    @Test void carryoverCapDoesNotRetroactivelyRemoveExistingCredit() {
        var b=balance(); b.getLeaveType().setCarryforwardMax(5.0); assertEquals(41.0,b.creditedTotalDays());
    }
    @Test void nullCreditsAreSafe() {
        var b=balance(); b.setAvailableDays(null); b.setCarryforwardDays(null); assertEquals(0.0,b.creditedTotalDays());
    }
}
