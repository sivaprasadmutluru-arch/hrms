package com.example.demo.base.service;

import com.example.demo.base.entity.DynamicEmailConfig;
import com.example.demo.base.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class EmailServiceSmtpConfigTest {
    final DynamicEmailConfigRepository configs=mock(DynamicEmailConfigRepository.class);
    final MockEnvironment environment=new MockEnvironment();
    final EmailLogRepository logs=mock(EmailLogRepository.class);
    final CompanyRepository companies=mock(CompanyRepository.class);
    final MailTemplateRepository templates=mock(MailTemplateRepository.class);
    final EmailService service=new EmailService(configs,logs,
            templates,companies,environment);

    void configureApplication() {
        environment.withProperty("spring.mail.host","smtp.example.invalid")
                .withProperty("spring.mail.username","platform@example.invalid")
                .withProperty("spring.mail.password","synthetic-test-credential");
    }
    @Test void platformAccountWithoutCompanyCanUseApplicationSmtp() {
        configureApplication();
        assertThat(service.hasActiveSmtpConfig(null)).isTrue();
        verifyNoInteractions(configs);
    }
    @Test void companyWithoutItsOwnConfigCanUseApplicationSmtp() {
        configureApplication();when(configs.findFirstByCompanyId(2L)).thenReturn(Optional.empty());
        assertThat(service.hasActiveSmtpConfig(2L)).isTrue();
        verify(configs,never()).findFirstByIsActiveTrueOrderByIdAsc();
    }
    @Test void explicitCompanyConfigTakesPrecedence() {
        configureApplication();var company=new DynamicEmailConfig();company.setIsActive(true);
        company.setHost("smtp.company.invalid");company.setUsername("company@example.invalid");
        when(configs.findFirstByCompanyId(2L)).thenReturn(Optional.of(company));
        // Incomplete explicit credentials must not silently send as the platform.
        assertThat(service.hasActiveSmtpConfig(2L)).isFalse();
        company.setPassword("synthetic-company-credential");
        assertThat(service.hasActiveSmtpConfig(2L)).isTrue();
    }
    @Test void branchUsesItsOrganizationsHeadOfficeSmtp() {
        var branch=new com.example.demo.base.entity.Company();
        branch.setId(3L);branch.setCompanyType(com.example.demo.base.entity.Company.CompanyType.BRANCH);
        branch.setParentCompanyId(2L);
        var config=new DynamicEmailConfig();
        config.setIsActive(true);config.setHost("smtp.acme.invalid");
        config.setUsername("hr@acme.invalid");config.setPassword("synthetic-credential");
        when(companies.findByIdPublic(3L)).thenReturn(Optional.of(branch));
        when(configs.findFirstByCompanyId(3L)).thenReturn(Optional.empty());
        when(configs.findFirstByCompanyId(2L)).thenReturn(Optional.of(config));
        assertThat(service.hasActiveSmtpConfig(3L)).isTrue();
    }
    @Test void missingPlatformCredentialsDoNotBorrowAnotherCompanyConfig() {
        when(configs.findFirstByCompanyId(2L)).thenReturn(Optional.empty());
        assertThat(service.hasActiveSmtpConfig(null)).isFalse();
        assertThat(service.hasActiveSmtpConfig(2L)).isFalse();
        verify(configs,never()).findFirstByIsActiveTrueOrderByIdAsc();
    }
    @Test void unconfiguredSmtpIsRecordedAsFailedInsteadOfPretendingToSend() {
        assertThat(service.sendEmail(2L,"test@example.invalid","Test","<p>Test</p>",null)).isFalse();
        var captured=org.mockito.ArgumentCaptor.forClass(com.example.demo.base.entity.EmailLog.class);
        verify(logs,atLeastOnce()).save(captured.capture());
        assertThat(captured.getValue().getStatus()).isEqualTo(com.example.demo.base.entity.EmailLog.EmailStatus.FAILED);
        assertThat(captured.getValue().getErrorMessage()).contains("not configured");
    }
    @Test void localEmailLinksUseTheLocalApplication() {
        assertThat(service.loginUrl()).isEqualTo("http://localhost:5173/login");
        assertThat(service.passwordResetUrl()).isEqualTo("http://localhost:5173/forgot-password");
    }
    @Test void deploymentEmailLinksUseConfiguredOriginWithoutDoubleSlashes() {
        environment.withProperty("app.frontend-url", "https://hr.example.com/");
        assertThat(service.loginUrl()).isEqualTo("https://hr.example.com/login");
        assertThat(service.passwordResetUrl()).isEqualTo("https://hr.example.com/forgot-password");
    }

    @Test void branchUsesOrganizationTemplateAndRestoresTenantContext() {
        var branch=new com.example.demo.base.entity.Company();
        branch.setId(3L);branch.setCompanyType(com.example.demo.base.entity.Company.CompanyType.BRANCH);
        branch.setParentCompanyId(2L);
        var headOffice=new com.example.demo.base.entity.Company();
        headOffice.setId(2L);headOffice.setSchemaName("acme_workspace");
        when(companies.findByIdPublic(3L)).thenReturn(Optional.of(branch));
        when(companies.findByIdPublic(2L)).thenReturn(Optional.of(headOffice));
        var organizationTemplate=new com.example.demo.base.entity.MailTemplate();
        organizationTemplate.setCompany(headOffice);
        organizationTemplate.setTemplateType("LEAVE_APPROVED");
        organizationTemplate.setSubject("Approved for {{employeeName}}");
        organizationTemplate.setBody("<p>Hello {{employeeName}}</p>");
        when(templates.findAll()).thenReturn(java.util.List.of(organizationTemplate));

        service.sendFromTemplate(3L,"LEAVE_APPROVED","alex@example.invalid",
                java.util.Map.of("employeeName","Alex & team"),null);

        var captured=org.mockito.ArgumentCaptor.forClass(com.example.demo.base.entity.EmailLog.class);
        verify(logs,atLeastOnce()).save(captured.capture());
        assertThat(captured.getValue().getSubject()).isEqualTo("Approved for Alex & team");
        assertThat(captured.getValue().getBody()).contains("<p>Hello Alex &amp; team</p>");
        assertThat(com.example.demo.common.tenant.TenantContext.getTenant()).isEqualTo("public");
    }
    @Test void branchDoesNotUseAnotherBranchesLegacyTemplate() {
        var branch=new com.example.demo.base.entity.Company();
        branch.setId(3L);branch.setCompanyType(com.example.demo.base.entity.Company.CompanyType.BRANCH);
        branch.setParentCompanyId(2L);
        var headOffice=new com.example.demo.base.entity.Company();
        headOffice.setId(2L);headOffice.setSchemaName("acme_workspace");
        var otherBranch=new com.example.demo.base.entity.Company();otherBranch.setId(4L);
        var otherTemplate=new com.example.demo.base.entity.MailTemplate();
        otherTemplate.setCompany(otherBranch);otherTemplate.setTemplateType("LEAVE_APPROVED");
        when(companies.findByIdPublic(3L)).thenReturn(Optional.of(branch));
        when(companies.findByIdPublic(2L)).thenReturn(Optional.of(headOffice));
        when(templates.findAll()).thenReturn(java.util.List.of(otherTemplate));
        service.sendFromTemplate(3L,"LEAVE_APPROVED","alex@example.invalid",java.util.Map.of(),null);
        verifyNoInteractions(logs);
        assertThat(com.example.demo.common.tenant.TenantContext.getTenant()).isEqualTo("public");
    }
}
