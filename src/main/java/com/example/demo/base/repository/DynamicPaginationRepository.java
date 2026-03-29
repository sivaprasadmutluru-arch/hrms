package com.example.demo.base.repository;

import com.example.demo.base.entity.DynamicPagination;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DynamicPaginationRepository extends JpaRepository<DynamicPagination, Long> {
    Optional<DynamicPagination> findByUserId(Long userId);
}
