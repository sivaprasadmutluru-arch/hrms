package com.example.demo.pms.repository;

import com.example.demo.pms.entity.QuestionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionTemplateRepository extends JpaRepository<QuestionTemplate, Long>, JpaSpecificationExecutor<QuestionTemplate> {
}
