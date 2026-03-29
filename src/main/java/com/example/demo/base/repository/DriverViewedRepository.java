package com.example.demo.base.repository;

import com.example.demo.base.entity.DriverViewed;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DriverViewedRepository extends JpaRepository<DriverViewed, Long> {
    List<DriverViewed> findByUserId(Long userId);
    Optional<DriverViewed> findByUserIdAndSection(Long userId, String section);
}
