package com.example.demo.helpdesk.repository;

import com.example.demo.helpdesk.entity.HelpdeskTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HelpdeskTagRepository extends JpaRepository<HelpdeskTag, Long> {
    List<HelpdeskTag> findByCompanyId(Long companyId);
}
