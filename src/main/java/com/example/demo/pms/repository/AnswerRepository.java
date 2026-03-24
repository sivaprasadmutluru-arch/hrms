package com.example.demo.pms.repository;

import com.example.demo.pms.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long>, JpaSpecificationExecutor<Answer> {
    List<Answer> findByQuestionId(Long questionId);
    List<Answer> findByRespondentId(Long respondentId);
}
