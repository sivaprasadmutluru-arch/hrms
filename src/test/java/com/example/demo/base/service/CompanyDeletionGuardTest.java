package com.example.demo.base.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.tenant.SchemaProvisioningService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyDeletionGuardTest {
    @Mock CompanyRepository companyRepository;
    @Mock SchemaProvisioningService schemas;
    @InjectMocks CompanyService service;

    @AfterEach void clear() { CompanyContext.clear(); }

    void headOfficeWithCurrentBranch() {
        Company ho = new Company(); ho.setId(10L); ho.setCompanyType(Company.CompanyType.HEAD_OFFICE);
        Company branch = new Company(); branch.setId(11L); branch.setCompanyType(Company.CompanyType.BRANCH);
        CompanyContext.set(11L);
        when(companyRepository.findById(10L)).thenReturn(Optional.of(ho));
        when(companyRepository.findByParentCompanyId(10L)).thenReturn(List.of(branch));
    }

    @Test void archiveCannotRemoveCurrentBranchThroughHeadOffice() {
        headOfficeWithCurrentBranch();
        assertThatThrownBy(() -> service.archive(10L, null)).isInstanceOf(BadRequestException.class);
        verify(companyRepository, never()).saveAll(any());
        verifyNoInteractions(schemas);
    }

    @Test void permanentDeletionFailsBeforeTenantCleanup() {
        headOfficeWithCurrentBranch();
        assertThatThrownBy(() -> service.purgePermanently(10L)).isInstanceOf(BadRequestException.class);
        verify(companyRepository, never()).deleteById(any());
        verifyNoInteractions(schemas);
    }
}
