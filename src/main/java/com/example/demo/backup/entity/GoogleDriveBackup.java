package com.example.demo.backup.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "google_drive_backups")
@Getter
@Setter
public class GoogleDriveBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_account_file")
    private String serviceAccountFile;

    @Column(name = "gdrive_folder_id", length = 255)
    private String gdriveFolderId;

    @Column(name = "backup_media")
    private Boolean backupMedia;

    @Column(name = "backup_db")
    private Boolean backupDb;

    @Column(name = "interval")
    private Boolean interval;

    @Column(name = "fixed")
    private Boolean fixed;

    @Column(name = "seconds")
    private Integer seconds;

    @Column(name = "hour")
    private Integer hour;

    @Column(name = "minute")
    private Integer minute;

    @Column(name = "active")
    private boolean active = false;
}
