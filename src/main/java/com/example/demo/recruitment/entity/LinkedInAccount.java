package com.example.demo.recruitment.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "linkedin_accounts")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LinkedInAccount extends BaseEntity {

    @Column(name = "username", length = 250, nullable = false)
    private String username;

    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "api_token", length = 500)
    private String apiToken;

    @Column(name = "sub_id", length = 250, unique = true)
    private String subId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;
}
