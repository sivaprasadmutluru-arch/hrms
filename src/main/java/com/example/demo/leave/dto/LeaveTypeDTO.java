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
        LeaveValidationType leaveValidationType,
        String colorCode,
        Boolean reset,
        Boolean accrualEnabled,
        MidYearJoinerMode midYearJoinerMode,
        Boolean negativeBalanceAllowed,
        Double negativeBalanceLimit,
        boolean isActive,
        java.util.List<Long> applicableEmployeeTypeIds,
        java.util.List<String> applicableEmployeeTypeNames
) {}
