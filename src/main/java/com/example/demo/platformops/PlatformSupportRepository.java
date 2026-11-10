package com.example.demo.platformops;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface PlatformSupportRepository extends JpaRepository<PlatformSupportTicket,Long> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from PlatformSupportTicket t where t.id=:id") Optional<PlatformSupportTicket> lockById(Long id);
}
