package com.example.demo.employee.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReportingManagerService {
    private final EmployeeRepository employees;
    private final EmployeeWorkInformationRepository workInformation;

    // Existing profiles are authoritative, including an explicitly cleared manager.
    public Employee resolve(Employee employee) {
        if (employee == null) return null;
        var fromWorkInfo = workInformation.findByEmployeeId(employee.getId())
                .map(com.example.demo.employee.entity.EmployeeWorkInformation::getReportingManager)
                .orElse(null);
        return fromWorkInfo != null ? fromWorkInfo : employee.getReportingManager();
    }

    public Employee validate(Employee employee, Long managerId) {
        if (managerId == null) return null;
        Employee manager = employees.findById(managerId)
                .orElseThrow(() -> new BadRequestException("Reporting manager does not exist"));
        Set<Long> visited = new HashSet<>();
        Employee ancestor = manager;
        while (ancestor != null) {
            if (ancestor.getId().equals(employee.getId()) || !visited.add(ancestor.getId()))
                throw new BadRequestException("Reporting manager assignment would create a cycle");
            ancestor = resolve(ancestor);
        }
        if (!manager.isActive() || !manager.getCompany().getId().equals(employee.getCompany().getId()))
            throw new BadRequestException("Reporting manager must be active and belong to the employee's company");
        return manager;
    }

    public void assign(Employee employee, Long managerId) {
        Employee manager = validate(employee, managerId);
        employee.setReportingManager(manager);
        employees.save(employee);
        workInformation.findByEmployeeId(employee.getId()).ifPresent(w -> {
            w.setReportingManager(manager);
            workInformation.save(w);
        });
    }
}
