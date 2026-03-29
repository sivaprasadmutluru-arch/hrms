package com.example.demo.backup.repository;

import com.example.demo.backup.entity.LocalBackup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocalBackupRepository extends JpaRepository<LocalBackup, Long> {
}
