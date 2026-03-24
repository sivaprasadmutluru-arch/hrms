package com.example.demo.pms.repository;

import com.example.demo.pms.entity.MeetingAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeetingAnswerRepository extends JpaRepository<MeetingAnswer, Long>, JpaSpecificationExecutor<MeetingAnswer> {
    List<MeetingAnswer> findByMeetingId(Long meetingId);
}
