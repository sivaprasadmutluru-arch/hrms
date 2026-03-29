package com.example.demo.views.repository;

import com.example.demo.views.entity.ActiveGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActiveGroupRepository extends JpaRepository<ActiveGroup, Long> {

    Optional<ActiveGroup> findByUserIdAndPath(Long userId, String path);
}
