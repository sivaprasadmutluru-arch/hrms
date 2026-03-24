package com.example.demo.common.event;

import com.example.demo.payroll.entity.Payslip;
import lombok.Getter;

/**
 * Published when a payslip is generated or confirmed.
 */
@Getter
public class PayslipGeneratedEvent extends HrmsEvent {

    private final Payslip payslip;

    public PayslipGeneratedEvent(Object source, Payslip payslip) {
        super(source,
                payslip.getCompany() != null ? payslip.getCompany().getId() : null,
                payslip.getEmployee() != null ? payslip.getEmployee().getId() : null);
        this.payslip = payslip;
    }
}
