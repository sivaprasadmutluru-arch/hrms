package com.example.demo.views.repository;

import com.example.demo.views.entity.ActiveTab;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActiveTabRepository extends JpaRepository<ActiveTab, Long> {

    Optional<ActiveTab> findByUserIdAndPath(Long userId, String path);
}
