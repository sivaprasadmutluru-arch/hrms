package com.example.demo.base.repository;

import com.example.demo.base.entity.WorkType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkTypeRepository extends JpaRepository<WorkType, Long>, JpaSpecificationExecutor<WorkType> {
    List<WorkType> findByCompanyId(Long companyId);
}
