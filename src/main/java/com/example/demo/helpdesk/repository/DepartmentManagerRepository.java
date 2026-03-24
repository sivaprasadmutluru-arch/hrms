package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.DepartmentManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentManagerRepository extends JpaRepository<DepartmentManager, Long>, JpaSpecificationExecutor<DepartmentManager> {
    List<DepartmentManager> findByDepartmentId(Long departmentId);
    List<DepartmentManager> findByManagerId(Long managerId);
}
