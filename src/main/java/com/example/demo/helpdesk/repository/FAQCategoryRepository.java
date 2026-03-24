package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.FAQCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FAQCategoryRepository extends JpaRepository<FAQCategory, Long>, JpaSpecificationExecutor<FAQCategory> {
}
