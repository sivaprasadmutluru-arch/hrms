package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.ReimbursementAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReimbursementAttachmentRepository extends JpaRepository<ReimbursementAttachment, Long>,
        JpaSpecificationExecutor<ReimbursementAttachment> {

    List<ReimbursementAttachment> findByReimbursementId(Long reimbursementId);
}
