package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssetCategoryRepository extends JpaRepository<AssetCategory, Long> {
    List<AssetCategory> findByCompanyId(Long companyId);
}
