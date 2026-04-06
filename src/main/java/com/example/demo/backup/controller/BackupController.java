package com.example.demo.backup.controller;

import com.example.demo.backup.entity.GoogleDriveBackup;
import com.example.demo.backup.entity.LocalBackup;
import com.example.demo.backup.service.BackupService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Tag(name = "Backup")
public class BackupController {

    private final BackupService backupService;

    @GetMapping("/local")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<LocalBackup> getLocalBackup() {
        return ResponseEntity.ok(backupService.getLocalBackup());
    }

    @PostMapping("/local")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<LocalBackup> saveLocalBackup(@RequestBody LocalBackup config) {
        return ResponseEntity.ok(backupService.saveLocalBackup(config));
    }

    @GetMapping("/gdrive")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<GoogleDriveBackup> getGoogleDriveBackup() {
        return ResponseEntity.ok(backupService.getGoogleDriveBackup());
    }

    @PostMapping("/gdrive")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<GoogleDriveBackup> saveGoogleDriveBackup(@RequestBody GoogleDriveBackup config) {
        return ResponseEntity.ok(backupService.saveGoogleDriveBackup(config));
    }
}
