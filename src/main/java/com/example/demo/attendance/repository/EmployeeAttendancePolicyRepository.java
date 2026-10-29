package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.EmployeeAttendancePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface EmployeeAttendancePolicyRepository extends JpaRepository<EmployeeAttendancePolicy, Long> {
    List<EmployeeAttendancePolicy> findByCompanyIdAndEmployeeIdInAndEffectiveFromLessThanEqualOrderByEffectiveFromDescIdDesc(
            Long companyId, List<Long> employeeIds, LocalDate end);
    List<EmployeeAttendancePolicy> findByCompanyIdAndEmployeeIdOrderByEffectiveFromDescIdDesc(Long companyId, Long employeeId);
}
