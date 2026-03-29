package com.example.demo.base.repository;

import com.example.demo.base.entity.NotificationSound;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NotificationSoundRepository extends JpaRepository<NotificationSound, Long> {
    Optional<NotificationSound> findByEmployeeId(Long employeeId);
}
