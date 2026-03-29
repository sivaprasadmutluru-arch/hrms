package com.example.demo.views.repository;

import com.example.demo.views.entity.SavedFilter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedFilterRepository extends JpaRepository<SavedFilter, Long> {

    List<SavedFilter> findByUserId(Long userId);

    List<SavedFilter> findByUserIdAndPath(Long userId, String path);
}
