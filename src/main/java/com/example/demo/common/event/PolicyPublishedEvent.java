package com.example.demo.common.event;

import com.example.demo.hrpolicy.entity.HrPolicy;
import lombok.Getter;

/**
 * Published when an HR Policy is published.
 * Listeners notify all employees in the affected company/organization.
 */
@Getter
public class PolicyPublishedEvent extends HrmsEvent {

    private final HrPolicy policy;

    public PolicyPublishedEvent(Object source, HrPolicy policy) {
        super(source,
                policy.getCompany() != null ? policy.getCompany().getId() : null,
                null);
        this.policy = policy;
    }
}
