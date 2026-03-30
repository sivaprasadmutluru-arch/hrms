package com.example.demo.base.repository;

import com.example.demo.base.entity.JobPosition;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobPositionRepository extends JpaRepository<JobPosition, Long>, JpaSpecificationExecutor<JobPosition> {
    List<JobPosition> findByCompanyId(Long companyId);
    List<JobPosition> findByDepartmentId(Long departmentId);

    @Override
    @EntityGraph(attributePaths = {"department", "company"})
    List<JobPosition> findAll();

    @Override
    @EntityGraph(attributePaths = {"department", "company"})
    List<JobPosition> findAll(Specification<JobPosition> spec);
}
