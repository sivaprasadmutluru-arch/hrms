package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AssetLotRepository extends JpaRepository<AssetLot, Long>, JpaSpecificationExecutor<AssetLot> {
}
