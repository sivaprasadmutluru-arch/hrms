package com.example.demo.asset.repository;

import com.example.demo.asset.entity.ReturnImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnImageRepository extends JpaRepository<ReturnImage, Long>, JpaSpecificationExecutor<ReturnImage> {
    List<ReturnImage> findByAssetId(Long assetId);
}
