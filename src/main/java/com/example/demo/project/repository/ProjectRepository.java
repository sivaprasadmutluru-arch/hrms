package com.example.demo.project.repository;

import com.example.demo.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    List<Project> findByCompanyId(Long companyId);
    List<Project> findByManagerId(Long managerId);
    List<Project> findByMembersId(Long employeeId);
}
