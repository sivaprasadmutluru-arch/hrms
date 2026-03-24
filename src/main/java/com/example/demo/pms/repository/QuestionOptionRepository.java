package com.example.demo.pms.repository;

import com.example.demo.pms.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long>, JpaSpecificationExecutor<QuestionOption> {
    List<QuestionOption> findByQuestionIdOrderBySequenceAsc(Long questionId);
}
