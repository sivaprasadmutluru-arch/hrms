package com.example.demo.base.repository;

import com.example.demo.base.entity.RotatingWorkType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RotatingWorkTypeRepository extends JpaRepository<RotatingWorkType, Long>, JpaSpecificationExecutor<RotatingWorkType> {
}
