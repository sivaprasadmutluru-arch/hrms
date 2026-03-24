package com.example.demo.base.repository;

import com.example.demo.base.entity.MailAutomation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MailAutomationRepository extends JpaRepository<MailAutomation, Long>, JpaSpecificationExecutor<MailAutomation> {
    List<MailAutomation> findByIsActiveTrue();
}
