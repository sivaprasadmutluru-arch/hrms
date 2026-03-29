package com.example.demo.outlookauth.entity;

import com.example.demo.base.entity.Company;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "azure_apis")
@Getter
@Setter
public class AzureApi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "outlook_client_id", length = 200)
    private String outlookClientId;

    @Column(name = "outlook_client_secret", length = 200)
    private String outlookClientSecret;

    @Column(name = "outlook_tenant_id", length = 200)
    private String outlookTenantId;

    @Column(name = "outlook_email", length = 254)
    private String outlookEmail;

    @Column(name = "outlook_display_name", length = 25)
    private String outlookDisplayName;

    @Column(name = "outlook_redirect_uri", length = 200)
    private String outlookRedirectUri;

    @Column(name = "outlook_authorization_url", length = 200,
            columnDefinition = "VARCHAR(200) DEFAULT 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'")
    private String outlookAuthorizationUrl;

    @Column(name = "outlook_token_url", length = 200,
            columnDefinition = "VARCHAR(200) DEFAULT 'https://login.microsoftonline.com/common/oauth2/v2.0/token'")
    private String outlookTokenUrl;

    @Column(name = "outlook_api_endpoint", length = 200,
            columnDefinition = "VARCHAR(200) DEFAULT 'https://graph.microsoft.com/v1.0'")
    private String outlookApiEndpoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "is_primary")
    private boolean isPrimary = false;

    @Column(name = "token", columnDefinition = "TEXT")
    private String token;

    @Column(name = "oauth_state", length = 100, nullable = true)
    private String oauthState;

    @Column(name = "last_refreshed", nullable = true)
    private LocalDateTime lastRefreshed;
}
