package com.example.demo.base.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganizationDeletionGuardTest {
    CompanyRepository companies = mock(CompanyRepository.class);
    DataSource dataSource = mock(DataSource.class);
    OrganizationService service = new OrganizationService(null, companies, null, null,
            null, null, null, null, null, null, dataSource);

    @org.junit.jupiter.api.BeforeEach void billing() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "billingService", mock(com.example.demo.billing.BillingService.class));
    }
    @AfterEach void clearContext() { CompanyContext.clear(); }

    Company company(long id, Company.CompanyType type) {
        Company company = new Company();
        company.setId(id);
        company.setCompanyType(type);
        return company;
    }

    @Test void blocksCurrentHeadOfficeBeforeAnyDeletionWork() {
        CompanyContext.set(10L);
        when(companies.findByOrganizationId(2L)).thenReturn(List.of(company(10, Company.CompanyType.HEAD_OFFICE)));
        assertThatThrownBy(() -> service.deleteOrganization(2L))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Cannot delete the company used for this login");
        verifyNoInteractions(dataSource);
    }

    @Test void blocksOrganizationWhenOneOfItsBranchesIsSelected() {
        CompanyContext.set(11L);
        when(companies.findByOrganizationId(2L)).thenReturn(List.of(
                company(10, Company.CompanyType.HEAD_OFFICE), company(11, Company.CompanyType.BRANCH)));
        assertThatThrownBy(() -> service.deleteOrganization(2L)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(dataSource);
    }

    @Test void permitsAnotherOrganizationToReachNormalDeletionLock() throws Exception {
        CompanyContext.set(50L);
        when(companies.findByOrganizationId(2L)).thenReturn(List.of(company(10, Company.CompanyType.HEAD_OFFICE)));
        when(dataSource.getConnection()).thenThrow(new SQLException("test lock boundary"));
        assertThatThrownBy(() -> service.deleteOrganization(2L)).hasMessageContaining("Failed to acquire deletion lock");
        verify(dataSource).getConnection();
    }

    @Test void allCompaniesModeDoesNotBlockDeletion() throws Exception {
        when(dataSource.getConnection()).thenThrow(new SQLException("test lock boundary"));
        assertThatThrownBy(() -> service.deleteOrganization(2L)).hasMessageContaining("Failed to acquire deletion lock");
        verifyNoInteractions(companies);
        verify(dataSource).getConnection();
    }
}
