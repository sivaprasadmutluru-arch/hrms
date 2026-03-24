package com.example.demo.employee.repository;

import com.example.demo.employee.entity.EmployeeGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeGeneralSettingRepository extends JpaRepository<EmployeeGeneralSetting, Long>, JpaSpecificationExecutor<EmployeeGeneralSetting> {
    Optional<EmployeeGeneralSetting> findByCompanyId(Long companyId);
}
