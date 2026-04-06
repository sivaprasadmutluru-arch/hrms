package com.example.demo.auth.repository;

import com.example.demo.auth.entity.UserGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserGroupRepository extends JpaRepository<UserGroup, Long> {
    List<UserGroup> findByCompanyId(Long companyId);
    List<UserGroup> findByMembersId(Long userId);
}
