package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.LinkedInAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LinkedInAccountRepository extends JpaRepository<LinkedInAccount, Long> {
    List<LinkedInAccount> findByCompanyId(Long companyId);
}
