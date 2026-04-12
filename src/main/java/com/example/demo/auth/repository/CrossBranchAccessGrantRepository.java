package com.example.demo.auth.repository;

import com.example.demo.auth.entity.CrossBranchAccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CrossBranchAccessGrantRepository extends JpaRepository<CrossBranchAccessGrant, Long>, JpaSpecificationExecutor<CrossBranchAccessGrant> {

    List<CrossBranchAccessGrant> findByUserId(Long userId);

    List<CrossBranchAccessGrant> findByTargetCompanyId(Long targetCompanyId);

    @Query("SELECT g FROM CrossBranchAccessGrant g WHERE g.targetCompany.id IN :ids OR g.grantedByCompany.id IN :ids")
    List<CrossBranchAccessGrant> findByCompanyIds(@Param("ids") List<Long> ids);

    boolean existsByUserIdAndTargetCompanyId(Long userId, Long targetCompanyId);

    void deleteByUserIdAndTargetCompanyId(Long userId, Long targetCompanyId);

    // Get all company IDs this user has been explicitly granted access to
    @Query("SELECT g.targetCompany.id FROM CrossBranchAccessGrant g WHERE g.userId = :userId AND g.isActive = true")
    List<Long> findGrantedCompanyIdsByUserId(Long userId);
}
