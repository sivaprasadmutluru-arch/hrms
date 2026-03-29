package com.example.demo.backup.controller;

import com.example.demo.backup.entity.GoogleDriveBackup;
import com.example.demo.backup.entity.LocalBackup;
import com.example.demo.backup.repository.GoogleDriveBackupRepository;
import com.example.demo.backup.repository.LocalBackupRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Tag(name = "Backup")
public class BackupController {

    private final LocalBackupRepository localBackupRepository;
    private final GoogleDriveBackupRepository googleDriveBackupRepository;

    // ---- Local Backup ----

    @GetMapping("/local")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<LocalBackup> getLocalBackup() {
        return ResponseEntity.ok(
                localBackupRepository.findAll().stream().findFirst().orElse(new LocalBackup())
        );
    }

    @PostMapping("/local")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional
    public ResponseEntity<LocalBackup> saveLocalBackup(@RequestBody LocalBackup config) {
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
            return ResponseEntity.ok(localBackupRepository.save(existing));
        }
        return ResponseEntity.ok(localBackupRepository.save(config));
    }

    // ---- Google Drive Backup ----

    @GetMapping("/gdrive")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<GoogleDriveBackup> getGoogleDriveBackup() {
        return ResponseEntity.ok(
                googleDriveBackupRepository.findAll().stream().findFirst().orElse(new GoogleDriveBackup())
        );
    }

    @PostMapping("/gdrive")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional
    public ResponseEntity<GoogleDriveBackup> saveGoogleDriveBackup(@RequestBody GoogleDriveBackup config) {
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
            return ResponseEntity.ok(googleDriveBackupRepository.save(existing));
        }
        return ResponseEntity.ok(googleDriveBackupRepository.save(config));
    }
}
