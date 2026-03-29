package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.ReimbursementMultipleAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReimbursementMultipleAttachmentRepository extends JpaRepository<ReimbursementMultipleAttachment, Long> {
}
