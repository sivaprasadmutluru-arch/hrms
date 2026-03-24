package com.example.demo.auth.repository;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long>, JpaSpecificationExecutor<UserRole> {

    List<UserRole> findByUserId(Long userId);

    List<UserRole> findByUserIdAndCompanyId(Long userId, Long companyId);

    List<UserRole> findByCompanyId(Long companyId);

    List<UserRole> findByCompanyIdIn(List<Long> companyIds);

    // Find all users with a specific role name in a specific company
    List<UserRole> findByCompanyIdAndRoleName(Long companyId, Role.RoleName roleName);

    void deleteByUserIdAndRoleIdAndCompanyId(Long userId, Long roleId, Long companyId);
}
