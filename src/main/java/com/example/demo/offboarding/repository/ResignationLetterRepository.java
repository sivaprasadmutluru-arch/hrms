package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.ResignationLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ResignationLetterRepository extends JpaRepository<ResignationLetter, Long>, JpaSpecificationExecutor<ResignationLetter> {
    List<ResignationLetter> findByEmployeeId(Long employeeId);
}
