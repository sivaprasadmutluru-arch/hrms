package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.FAQ;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface FAQRepository extends JpaRepository<FAQ, Long>, JpaSpecificationExecutor<FAQ> {
    List<FAQ> findByCategoryId(Long categoryId);
}
