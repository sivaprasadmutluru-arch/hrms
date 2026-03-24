package com.example.demo.base.repository;

import com.example.demo.base.entity.AnnouncementComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AnnouncementCommentRepository extends JpaRepository<AnnouncementComment, Long>, JpaSpecificationExecutor<AnnouncementComment> {
    List<AnnouncementComment> findByAnnouncementId(Long announcementId);
}
