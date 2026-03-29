package com.example.demo.payroll.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_reimbursement_multiple_attachments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class ReimbursementMultipleAttachment extends BaseEntity {

    @Column(name = "attachment_path")
    private String attachmentPath;
}
