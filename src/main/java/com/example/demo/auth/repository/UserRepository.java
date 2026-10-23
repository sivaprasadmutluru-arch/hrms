package com.example.demo.auth.repository;

import com.example.demo.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    @Query("select u from User u where lower(trim(u.email)) = lower(trim(:email))")
    Optional<User> findByNormalizedEmail(@Param("email") String email);
    Optional<User> findByUsernameOrEmail(String username, String email);

    /** Preserve exact usernames while accepting email casing and surrounding whitespace. */
    default Optional<User> findForLogin(String suppliedIdentifier) {
        String identifier = suppliedIdentifier == null ? "" : suppliedIdentifier.trim();
        if (identifier.isEmpty()) return Optional.empty();
        return findByUsername(identifier)
                .or(() -> findByNormalizedEmail(identifier));
    }
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<User> findByResetToken(String resetToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
