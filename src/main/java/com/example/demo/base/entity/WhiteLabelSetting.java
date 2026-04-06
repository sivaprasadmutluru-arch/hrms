package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * White-label / branding settings for a company (typically the HQ).
 * Allows replacing the default platform name and logo with the company's own brand.
 */
@Entity
@Table(name = "white_label_settings")
@Getter
@Setter
public class WhiteLabelSetting extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    @Column(name = "brand_name", length = 100)
    private String brandName;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "favicon_url", length = 500)
    private String faviconUrl;

    @Column(name = "primary_color", length = 20)
    private String primaryColor;

    @Column(name = "is_enabled")
    private boolean isEnabled = false;
}
