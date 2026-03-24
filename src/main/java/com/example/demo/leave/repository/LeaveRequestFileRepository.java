package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveRequestFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestFileRepository extends JpaRepository<LeaveRequestFile, Long>, JpaSpecificationExecutor<LeaveRequestFile> {
    List<LeaveRequestFile> findByLeaveRequestId(Long leaveRequestId);
}
