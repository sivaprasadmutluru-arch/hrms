package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.ReimbursementFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReimbursementFileRepository extends JpaRepository<ReimbursementFile, Long> {
    List<ReimbursementFile> findByReimbursementId(Long reimbursementId);
}
