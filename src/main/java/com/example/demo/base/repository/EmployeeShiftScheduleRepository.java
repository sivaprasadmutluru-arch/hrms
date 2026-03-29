package com.example.demo.base.repository;

import com.example.demo.base.entity.EmployeeShiftSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmployeeShiftScheduleRepository extends JpaRepository<EmployeeShiftSchedule, Long> {
    List<EmployeeShiftSchedule> findByShiftId(Long shiftId);
    List<EmployeeShiftSchedule> findByDayId(Long dayId);
}
