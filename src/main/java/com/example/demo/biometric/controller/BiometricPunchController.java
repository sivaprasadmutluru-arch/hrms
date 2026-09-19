package com.example.demo.biometric.controller;

import com.example.demo.biometric.entity.BiometricPunchReceipt;
import com.example.demo.biometric.repository.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.auth.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/biometric/punches") @RequiredArgsConstructor
public class BiometricPunchController {
    private final BiometricPunchReceiptRepository receipts;
    private final EmployeeRepository employees;
    private final BiometricDeviceRepository devices;

    public record Punch(Long id, Long employeeId, String employeeName, String deviceName,
            String serialNumber, String deviceUserId, LocalDateTime deviceTime, Integer deviceStatus,
            String processingState, LocalDateTime receivedAt) {}

    @GetMapping @PreAuthorize("hasAuthority('attendance:view')") @Transactional(readOnly=true)
    public Page<Punch> list(@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="25") int size,
            @RequestParam(required=false) Long employeeId,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to) {
        var scope=AccessScopeContext.get();
        if(scope==null) throw new AccessDeniedException("Company context required");
        Specification<BiometricPunchReceipt> visible=(root,query,cb)-> {
            var employeeQuery=query.subquery(Long.class);
            var employee=employeeQuery.from(Employee.class);
            var restrictions=new ArrayList<jakarta.persistence.criteria.Predicate>();
            restrictions.add(cb.equal(employee.get("id"),root.get("employeeId")));
            if(!scope.hasUnrestrictedAccess()) restrictions.add(employee.get("company").get("id").in(scope.getAccessibleCompanyIds()));
            if(scope.getFilterCompanyId()!=null) restrictions.add(cb.equal(employee.get("company").get("id"),scope.getFilterCompanyId()));
            if(scope.isSelfScope()) restrictions.add(cb.equal(employee.get("user").get("id"),scope.getUserId()));
            if(scope.getScope()==UserRole.AccessScope.DEPARTMENT) {
                if(scope.getDepartmentId()==null) restrictions.add(cb.disjunction());
                else restrictions.add(cb.equal(employee.get("department").get("id"),scope.getDepartmentId()));
            }
            employeeQuery.select(employee.get("id")).where(restrictions.toArray(jakarta.persistence.criteria.Predicate[]::new));
            var predicate=cb.exists(employeeQuery);
            if(employeeId!=null) predicate=cb.and(predicate,cb.equal(root.get("employeeId"),employeeId));
            if(from!=null) predicate=cb.and(predicate,cb.greaterThanOrEqualTo(root.get("deviceTime"),from.atStartOfDay()));
            if(to!=null) predicate=cb.and(predicate,cb.lessThan(root.get("deviceTime"),to.plusDays(1).atStartOfDay()));
            return predicate;
        };
        return receipts.findAll(visible,PageRequest.of(Math.max(page,0),Math.max(1,Math.min(size,100)),Sort.by(Sort.Direction.DESC,"deviceTime","id")))
            .map(r->{
                var e=employees.findById(r.getEmployeeId()).orElse(null);
                var d=devices.findBySerialNumberAndIsActiveTrue(r.getSerialNumber()).orElse(null);
                return new Punch(r.getId(),r.getEmployeeId(),e==null?null:e.getFirstName()+" "+e.getLastName(),
                    d==null?r.getSerialNumber():d.getName(),r.getSerialNumber(),r.getDeviceUserId(),r.getDeviceTime(),
                    r.getDeviceStatus(),r.getProcessingState(),r.getCreatedAt());
            });
    }
}
