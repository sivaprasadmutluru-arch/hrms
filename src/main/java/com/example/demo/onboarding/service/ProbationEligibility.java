package com.example.demo.onboarding.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.onboarding.entity.ProbationPolicy;
import com.example.demo.onboarding.repository.ProbationPolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;

@Service @RequiredArgsConstructor
public class ProbationEligibility {
    private final ProbationPolicyRepository policies;
    private final EmployeeWorkInformationRepository workInfos;
    private final com.example.demo.onboarding.repository.ProbationConfirmationRepository confirmations;

    public LocalDate joiningDate(Employee employee) {
        if (employee.getDateJoining() != null) return employee.getDateJoining();
        return workInfos.findByEmployeeId(employee.getId()).map(w -> w.getDateJoining()).orElse(null);
    }

    public boolean applies(ProbationPolicy policy, LocalDate joining) {
        return policy != null && policy.isEnabled() && joining != null
                && !joining.isBefore(policy.getEffectiveFrom());
    }

    /** null means the employee keeps the pre-existing leave policy. */
    public LocalDate leaveStartsOn(Employee employee) {
        var confirmation = confirmations.findByEmployeeId(employee.getId()).orElse(null);
        if (confirmation != null) return confirmation.getConfirmedOn();
        var policy = policies.findByCompanyId(employee.getCompany().getId()).orElse(null);
        if (policy == null || !policy.isEnabled()) return null;
        LocalDate joining = joiningDate(employee);
        // Missing joining date must not accidentally grant leave under an enabled policy.
        if (joining == null) return LocalDate.MAX;
        // Confirmation and entitlement provisioning must commit before any monthly credit.
        return applies(policy, joining) ? LocalDate.MAX : null;
    }

    public boolean applicableCategory(Employee employee, com.example.demo.leave.entity.LeaveType type) {
        if (type.getApplicableEmployeeTypes().isEmpty()) return true;
        var category = workInfos.findByEmployeeId(employee.getId()).map(w -> w.getEmployeeType()).orElse(null);
        return category != null && type.getApplicableEmployeeTypes().stream()
                .anyMatch(t -> java.util.Objects.equals(t.getId(), category.getId()));
    }
}
