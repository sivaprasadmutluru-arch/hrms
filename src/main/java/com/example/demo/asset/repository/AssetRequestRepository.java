package com.example.demo.asset.repository;

import com.example.demo.asset.entity.AssetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface AssetRequestRepository extends JpaRepository<AssetRequest, Long> {
    Page<AssetRequest> findByCompanyId(Long companyId, Pageable pageable);
    List<AssetRequest> findByCompanyId(Long companyId);
    long countByCompanyIdAndStatus(Long companyId, AssetRequest.RequestStatus status);
}
