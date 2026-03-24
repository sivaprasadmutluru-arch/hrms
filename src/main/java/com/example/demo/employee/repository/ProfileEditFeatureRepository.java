package com.example.demo.employee.repository;

import com.example.demo.employee.entity.ProfileEditFeature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfileEditFeatureRepository extends JpaRepository<ProfileEditFeature, Long>, JpaSpecificationExecutor<ProfileEditFeature> {
    List<ProfileEditFeature> findByCompanyId(Long companyId);
    Optional<ProfileEditFeature> findByCompanyIdAndFeatureName(Long companyId, String featureName);
}
