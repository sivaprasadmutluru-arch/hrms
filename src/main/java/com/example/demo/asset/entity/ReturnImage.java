package com.example.demo.asset.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "asset_return_images")
@Getter
@Setter
public class ReturnImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(name = "description")
    private String description;
}
