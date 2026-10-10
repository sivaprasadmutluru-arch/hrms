package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="carr_task_attachments") @Getter @Setter
public class CarrTaskAttachment extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false)
    @JoinColumn(name="task_id", nullable=false) private CarrResponsibility task;
    @Column(name="uploaded_by_user_id", nullable=false) private Long uploadedByUserId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private Kind kind;
    @Column(nullable=false, length=255) private String filename;
    @Column(name="storage_path", nullable=false, length=1000) private String storagePath;
    @Column(name="file_size", nullable=false) private long fileSize;
    public enum Kind { INSTRUCTION, DELIVERABLE }
}
