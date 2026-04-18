package com.example.demo.asset.repository;

import com.example.demo.asset.entity.Asset;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long>, JpaSpecificationExecutor<Asset> {

    @Override
    @EntityGraph(attributePaths = {"category", "assignedTo"})
    List<Asset> findAll(Specification<Asset> spec);

    @Override
    @EntityGraph(attributePaths = {"category", "assignedTo"})
    List<Asset> findAll();

    @Override
    @EntityGraph(attributePaths = {"category", "assignedTo"})
    Optional<Asset> findById(Long id);

    List<Asset> findByCompanyId(Long companyId);
    List<Asset> findByCompanyIdAndStatus(Long companyId, Asset.AssetStatus status);
    List<Asset> findByAssignedToId(Long employeeId);
}
