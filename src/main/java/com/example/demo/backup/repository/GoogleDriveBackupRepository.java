package com.example.demo.backup.repository;

import com.example.demo.backup.entity.GoogleDriveBackup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoogleDriveBackupRepository extends JpaRepository<GoogleDriveBackup, Long> {
}
