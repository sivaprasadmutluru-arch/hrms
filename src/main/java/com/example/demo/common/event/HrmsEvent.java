package com.example.demo.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Base class for all HRMS domain events.
 * Extend this for specific business events that other modules can listen to.
 */
@Getter
public abstract class HrmsEvent extends ApplicationEvent {

    private final Long companyId;
    private final Long employeeId;

    protected HrmsEvent(Object source, Long companyId, Long employeeId) {
        super(source);
        this.companyId = companyId;
        this.employeeId = employeeId;
    }
}
