package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrTaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CarrTaskAttachmentRepository extends JpaRepository<CarrTaskAttachment, Long> {
    List<CarrTaskAttachment> findByTaskIdAndIsActiveTrueOrderByCreatedAtDesc(Long taskId);
    boolean existsByTaskIdAndUploadedByUserIdAndKindAndIsActiveTrue(Long taskId, Long userId, CarrTaskAttachment.Kind kind);
}
