package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.TaxBracket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TaxBracketRepository extends JpaRepository<TaxBracket, Long>, JpaSpecificationExecutor<TaxBracket> {
    List<TaxBracket> findByFilingStatusId(Long filingStatusId);
}
