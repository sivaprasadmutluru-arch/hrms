package com.example.demo.base.repository;

import com.example.demo.base.entity.RotatingShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RotatingShiftRepository extends JpaRepository<RotatingShift, Long>, JpaSpecificationExecutor<RotatingShift> {
}
