package com.example.demo.backup.service;

import com.example.demo.backup.entity.GoogleDriveBackup;
import com.example.demo.backup.entity.LocalBackup;
import com.example.demo.backup.repository.GoogleDriveBackupRepository;
import com.example.demo.backup.repository.LocalBackupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BackupService {

    private final LocalBackupRepository localBackupRepository;
    private final GoogleDriveBackupRepository googleDriveBackupRepository;

    @Transactional(readOnly = true)
    public LocalBackup getLocalBackup() {
        return localBackupRepository.findAll().stream().findFirst().orElse(new LocalBackup());
    }

    public LocalBackup saveLocalBackup(LocalBackup config) {
        LocalBackup existing = localBackupRepository.findAll().stream().findFirst().orElse(null);
        if (existing != null) {
            existing.setBackupPath(config.getBackupPath());
            existing.setBackupMedia(config.getBackupMedia());
            existing.setBackupDb(config.getBackupDb());
            existing.setInterval(config.getInterval());
            existing.setFixed(config.getFixed());
            existing.setSeconds(config.getSeconds());
            existing.setHour(config.getHour());
            existing.setMinute(config.getMinute());
            existing.setActive(config.isActive());
            return localBackupRepository.save(existing);
        }
        return localBackupRepository.save(config);
    }

    @Transactional(readOnly = true)
    public GoogleDriveBackup getGoogleDriveBackup() {
        return googleDriveBackupRepository.findAll().stream().findFirst().orElse(new GoogleDriveBackup());
    }

    public GoogleDriveBackup saveGoogleDriveBackup(GoogleDriveBackup config) {
        GoogleDriveBackup existing = googleDriveBackupRepository.findAll().stream().findFirst().orElse(null);
        if (existing != null) {
            existing.setServiceAccountFile(config.getServiceAccountFile());
            existing.setGdriveFolderId(config.getGdriveFolderId());
            existing.setBackupMedia(config.getBackupMedia());
            existing.setBackupDb(config.getBackupDb());
            existing.setInterval(config.getInterval());
            existing.setFixed(config.getFixed());
            existing.setSeconds(config.getSeconds());
            existing.setHour(config.getHour());
            existing.setMinute(config.getMinute());
            existing.setActive(config.isActive());
            return googleDriveBackupRepository.save(existing);
        }
        return googleDriveBackupRepository.save(config);
    }
}
