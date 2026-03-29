package com.example.demo.dynamicfields.repository;

import com.example.demo.dynamicfields.entity.DynamicField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DynamicFieldRepository extends JpaRepository<DynamicField, Long> {
    List<DynamicField> findByModel(String model);
    List<DynamicField> findByModelAndRemoveColumnFalse(String model);
}
