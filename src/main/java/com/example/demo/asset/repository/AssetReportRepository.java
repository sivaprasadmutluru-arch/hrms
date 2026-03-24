package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetReportRepository extends JpaRepository<AssetReport, Long>, JpaSpecificationExecutor<AssetReport> {
    List<AssetReport> findByAssetId(Long assetId);
}
