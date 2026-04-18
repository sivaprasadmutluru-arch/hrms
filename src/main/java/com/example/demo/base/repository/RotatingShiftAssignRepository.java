package com.example.demo.base.repository;

import com.example.demo.base.entity.RotatingShiftAssign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RotatingShiftAssignRepository extends JpaRepository<RotatingShiftAssign, Long>, JpaSpecificationExecutor<RotatingShiftAssign> {
    List<RotatingShiftAssign> findByEmployeeCompanyId(Long companyId);
    List<RotatingShiftAssign> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeIdAndRotatingShiftId(Long employeeId, Long rotatingShiftId);
    List<RotatingShiftAssign> findByNextChangeDateLessThanEqual(LocalDate date);
}
