package com.example.demo.backup.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "local_backups")
@Getter
@Setter
public class LocalBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "backup_path", length = 255)
    private String backupPath;

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
