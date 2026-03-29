package com.example.demo.accessibility.repository;

import com.example.demo.accessibility.entity.DefaultAccessibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DefaultAccessibilityRepository extends JpaRepository<DefaultAccessibility, Long> {
    List<DefaultAccessibility> findByEnabledTrue();
    List<DefaultAccessibility> findByFeature(String feature);
}
