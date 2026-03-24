package com.example.demo.base.repository;

import com.example.demo.base.entity.AnnouncementView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnnouncementViewRepository extends JpaRepository<AnnouncementView, Long>, JpaSpecificationExecutor<AnnouncementView> {
    List<AnnouncementView> findByAnnouncementId(Long announcementId);
    Optional<AnnouncementView> findByAnnouncementIdAndEmployeeId(Long announcementId, Long employeeId);
    long countByAnnouncementId(Long announcementId);
}
