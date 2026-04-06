package com.example.demo.accessibility.service;

import com.example.demo.accessibility.entity.DefaultAccessibility;
import com.example.demo.accessibility.repository.DefaultAccessibilityRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AccessibilityService {

    private final DefaultAccessibilityRepository defaultAccessibilityRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<DefaultAccessibility> listAll() {
        return defaultAccessibilityRepository.findAll();
    }

    @Transactional(readOnly = true)
    public DefaultAccessibility getById(Long id) {
        return defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
    }

    public DefaultAccessibility create(DefaultAccessibility request) {
        DefaultAccessibility da = new DefaultAccessibility();
        da.setFeature(request.getFeature());
        da.setFilter(request.getFilter());
        da.setExcludeAll(request.isExcludeAll());
        da.setEnabled(request.isEnabled());
        return defaultAccessibilityRepository.save(da);
    }

    public DefaultAccessibility update(Long id, DefaultAccessibility request) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        da.setFeature(request.getFeature());
        da.setFilter(request.getFilter());
        da.setExcludeAll(request.isExcludeAll());
        da.setEnabled(request.isEnabled());
        return defaultAccessibilityRepository.save(da);
    }

    public void delete(Long id) {
        defaultAccessibilityRepository.deleteById(id);
    }

    public DefaultAccessibility addEmployees(Long id, List<Long> employeeIds) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        for (Long empId : employeeIds) {
            Employee emp = employeeRepository.findById(empId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", empId));
            if (!da.getEmployees().contains(emp)) {
                da.getEmployees().add(emp);
            }
        }
        return defaultAccessibilityRepository.save(da);
    }

    public void removeEmployee(Long id, Long employeeId) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        da.getEmployees().removeIf(emp -> emp.getId().equals(employeeId));
        defaultAccessibilityRepository.save(da);
    }
}
