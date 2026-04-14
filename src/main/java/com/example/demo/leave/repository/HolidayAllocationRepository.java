package com.example.demo.leave.repository;

import com.example.demo.leave.entity.HolidayAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HolidayAllocationRepository extends JpaRepository<HolidayAllocation, Long> {

    List<HolidayAllocation> findByCompanyId(Long companyId);

    List<HolidayAllocation> findByEmployeeId(Long employeeId);

    List<HolidayAllocation> findByDepartmentId(Long departmentId);

    boolean existsByHolidayIdAndEmployeeId(Long holidayId, Long employeeId);

    boolean existsByHolidayIdAndDepartmentId(Long holidayId, Long departmentId);

    // All allocations that apply to an employee (directly or via department)
    @Query("""
        SELECT ha FROM HolidayAllocation ha
        WHERE ha.company.id = :companyId
          AND (ha.employee.id = :employeeId
               OR ha.department.id = :departmentId)
    """)
    List<HolidayAllocation> findApplicableForEmployee(Long companyId, Long employeeId, Long departmentId);
}
