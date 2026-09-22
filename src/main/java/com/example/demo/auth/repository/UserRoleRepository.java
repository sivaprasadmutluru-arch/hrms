package com.example.demo.auth.repository;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long>, JpaSpecificationExecutor<UserRole> {

    List<UserRole> findByUserId(Long userId);

    List<UserRole> findByUserIdAndCompanyId(Long userId, Long companyId);

    List<UserRole> findByCompanyId(Long companyId);

    List<UserRole> findByCompanyIdIn(List<Long> companyIds);

    // Find all users with a specific role name in a specific company
    List<UserRole> findByCompanyIdAndRoleName(Long companyId, Role.RoleName roleName);

    void deleteByUserIdAndRoleIdAndCompanyId(Long userId, Long roleId, Long companyId);

    @Query("select ur from UserRole ur where ur.user.id=:userId and ur.isActive=true and ur.assignmentStatus=:status " +
            "and (ur.effectiveFrom is null or ur.effectiveFrom<=:today) and (ur.expiresOn is null or ur.expiresOn>=:today)")
    List<UserRole> findEffectiveByUserId(@Param("userId") Long userId, @Param("today") LocalDate today,
                                         @Param("status") UserRole.AssignmentStatus status);

    @Query("select count(distinct ur.company.id) from UserRole ur where ur.user.id=:userId and ur.role.name=:role " +
            "and ur.assignmentStatus=:status and (ur.expiresOn is null or ur.expiresOn>=:today)")
    long countActiveCompanies(@Param("userId") Long userId, @Param("role") Role.RoleName role,
                              @Param("today") LocalDate today, @Param("status") UserRole.AssignmentStatus status);

    @Query("select count(ur) from UserRole ur where ur.role.name in :roles and ur.assignmentStatus=:status")
    long countActiveByRoleNames(@Param("roles") List<Role.RoleName> roles,
                                @Param("status") UserRole.AssignmentStatus status);
}
