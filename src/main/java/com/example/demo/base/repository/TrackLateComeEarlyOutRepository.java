package com.example.demo.base.repository;

import com.example.demo.base.entity.TrackLateComeEarlyOut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TrackLateComeEarlyOutRepository extends JpaRepository<TrackLateComeEarlyOut, Long>, JpaSpecificationExecutor<TrackLateComeEarlyOut> {
    Optional<TrackLateComeEarlyOut> findFirstByCompanyId(Long companyId);
}
