package com.example.demo.carr.repository;

import com.example.demo.carr.entity.CarrReward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CarrRewardRepository extends JpaRepository<CarrReward, Long> {
    List<CarrReward> findByCarrIdOrderById(Long carrId);
}
