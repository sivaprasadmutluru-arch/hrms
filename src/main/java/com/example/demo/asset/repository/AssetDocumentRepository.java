package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetDocumentRepository extends JpaRepository<AssetDocument, Long>, JpaSpecificationExecutor<AssetDocument> {
    List<AssetDocument> findByAssetId(Long assetId);
}
