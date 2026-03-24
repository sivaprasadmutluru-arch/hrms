package com.example.demo.pms.repository;

import com.example.demo.pms.entity.AnonymousFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AnonymousFeedbackRepository extends JpaRepository<AnonymousFeedback, Long>, JpaSpecificationExecutor<AnonymousFeedback> {
}
