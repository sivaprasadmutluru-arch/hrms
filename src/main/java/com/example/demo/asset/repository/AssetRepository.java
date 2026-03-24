package com.example.demo.asset.repository;

import com.example.demo.asset.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long>, JpaSpecificationExecutor<Asset> {
    List<Asset> findByCompanyId(Long companyId);
    List<Asset> findByCompanyIdAndStatus(Long companyId, Asset.AssetStatus status);
    List<Asset> findByAssignedToId(Long employeeId);
}
