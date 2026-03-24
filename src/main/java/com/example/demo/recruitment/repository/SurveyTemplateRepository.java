package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.SurveyTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, Long>,
        JpaSpecificationExecutor<SurveyTemplate> {
    List<SurveyTemplate> findByCompanyId(Long companyId);
}
