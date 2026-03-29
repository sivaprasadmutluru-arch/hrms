package com.example.demo.views.repository;

import com.example.demo.views.entity.ToggleColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ToggleColumnRepository extends JpaRepository<ToggleColumn, Long> {

    List<ToggleColumn> findByUserId(Long userId);

    Optional<ToggleColumn> findByUserIdAndPath(Long userId, String path);
}
