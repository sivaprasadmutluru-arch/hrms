package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetAssignmentRepository extends JpaRepository<AssetAssignment, Long>, JpaSpecificationExecutor<AssetAssignment> {
    List<AssetAssignment> findByAssetId(Long assetId);
    List<AssetAssignment> findByEmployeeId(Long employeeId);
    List<AssetAssignment> findByAssetIdAndIsReturnedFalse(Long assetId);
}
