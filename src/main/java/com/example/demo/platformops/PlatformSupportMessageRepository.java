package com.example.demo.platformops;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;
public interface PlatformSupportMessageRepository extends JpaRepository<PlatformSupportMessage,Long> {
 Page<PlatformSupportMessage> findByTicketIdOrderByIdDesc(Long ticketId,Pageable page);
}
