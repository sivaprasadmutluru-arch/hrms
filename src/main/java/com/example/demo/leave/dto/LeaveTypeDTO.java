package com.example.demo.leave.dto;

import com.example.demo.leave.entity.LeaveType.CarryforwardType;
import com.example.demo.leave.entity.LeaveType.LeaveValidationType;
import com.example.demo.leave.entity.LeaveType.MidYearJoinerMode;
import com.example.demo.leave.entity.LeaveType.PaymentType;

public record LeaveTypeDTO(
        Long id,
        String name,
        Integer totalDays,
        PaymentType paymentType,
        CarryforwardType carryforwardType,
        Double carryforwardMax,
        Integer carryforwardExpireIn,
        String carryforwardExpirePeriod,
        java.time.LocalDate carryforwardExpireDate,
        LeaveValidationType leaveValidationType,
        String colorCode,
        Boolean reset,
        String resetBased,
        String resetMonth,
        String resetDay,
        String resetWeekend,
        Boolean accrualEnabled,
        MidYearJoinerMode midYearJoinerMode,
        Boolean negativeBalanceAllowed,
        Double negativeBalanceLimit,
        Boolean excludeWeekend,
        boolean isActive,
        java.util.List<Long> applicableEmployeeTypeIds,
        java.util.List<String> applicableEmployeeTypeNames
) {}
