package com.example.demo.outlookauth.repository;

import com.example.demo.outlookauth.entity.AzureApi;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AzureApiRepository extends JpaRepository<AzureApi, Long> {

    List<AzureApi> findByCompanyId(Long companyId);

    Optional<AzureApi> findFirstByIsPrimaryTrue();

    Optional<AzureApi> findByCompanyIdAndIsPrimaryTrue(Long companyId);
}
