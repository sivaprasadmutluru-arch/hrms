package com.example.demo.employee.repository;

import com.example.demo.employee.entity.ActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActionTypeRepository extends JpaRepository<ActionType, Long>,
        JpaSpecificationExecutor<ActionType> {

    List<ActionType> findByCompanyId(Long companyId);
}
