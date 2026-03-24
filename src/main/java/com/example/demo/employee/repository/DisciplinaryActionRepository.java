package com.example.demo.employee.repository;

import com.example.demo.employee.entity.DisciplinaryAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DisciplinaryActionRepository extends JpaRepository<DisciplinaryAction, Long>, JpaSpecificationExecutor<DisciplinaryAction> {
}
