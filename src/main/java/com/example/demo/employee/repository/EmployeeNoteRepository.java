package com.example.demo.employee.repository;

import com.example.demo.employee.entity.EmployeeNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeNoteRepository extends JpaRepository<EmployeeNote, Long>,
        JpaSpecificationExecutor<EmployeeNote> {

    List<EmployeeNote> findByEmployeeId(Long employeeId);
}
