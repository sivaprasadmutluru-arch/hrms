package com.example.demo.audit.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "account_block_unblock")
@Getter
@Setter
public class AccountBlockUnblock extends BaseEntity {

    @Column(name = "is_enabled")
    private boolean enabled = false;
}
