package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.ReimbursementComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReimbursementCommentRepository extends JpaRepository<ReimbursementComment, Long>,
        JpaSpecificationExecutor<ReimbursementComment> {

    List<ReimbursementComment> findByReimbursementId(Long reimbursementId);
}
