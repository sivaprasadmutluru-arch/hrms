package com.example.demo.leave.repository;

import com.example.demo.leave.entity.RestrictLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RestrictLeaveRepository extends JpaRepository<RestrictLeave, Long>, JpaSpecificationExecutor<RestrictLeave> {
}
