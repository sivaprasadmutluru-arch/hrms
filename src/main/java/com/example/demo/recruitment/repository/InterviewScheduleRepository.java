package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.InterviewSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface InterviewScheduleRepository extends JpaRepository<InterviewSchedule, Long>, JpaSpecificationExecutor<InterviewSchedule> {
    List<InterviewSchedule> findByCandidateId(Long candidateId);
}
