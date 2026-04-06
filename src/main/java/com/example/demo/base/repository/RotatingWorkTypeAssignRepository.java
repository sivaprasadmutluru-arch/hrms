package com.example.demo.base.repository;

import com.example.demo.base.entity.RotatingWorkTypeAssign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RotatingWorkTypeAssignRepository extends JpaRepository<RotatingWorkTypeAssign, Long>, JpaSpecificationExecutor<RotatingWorkTypeAssign> {
    List<RotatingWorkTypeAssign> findByEmployeeCompanyId(Long companyId);
    List<RotatingWorkTypeAssign> findByEmployeeId(Long employeeId);
}
