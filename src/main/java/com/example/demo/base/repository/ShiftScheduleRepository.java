package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftScheduleRepository extends JpaRepository<ShiftSchedule, Long>, JpaSpecificationExecutor<ShiftSchedule> {
    List<ShiftSchedule> findByCompanyId(Long companyId);
}
