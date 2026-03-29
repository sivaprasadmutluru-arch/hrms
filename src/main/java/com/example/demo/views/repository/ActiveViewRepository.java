package com.example.demo.views.repository;

import com.example.demo.views.entity.ActiveView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActiveViewRepository extends JpaRepository<ActiveView, Long> {

    Optional<ActiveView> findByUserIdAndPath(Long userId, String path);
}
