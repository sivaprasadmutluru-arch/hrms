package com.example.demo.audit.repository;

import com.example.demo.audit.entity.HistoryTrackingFields;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoryTrackingFieldsRepository extends JpaRepository<HistoryTrackingFields, Long> {}
