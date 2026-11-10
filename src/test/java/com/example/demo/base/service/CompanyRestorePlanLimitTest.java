package com.example.demo.base.service;
import com.example.demo.base.entity.*;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.billing.*;
import com.example.demo.audit.AuditService;
import com.example.demo.common.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.mockito.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class CompanyRestorePlanLimitTest {
    @Mock CompanyRepository companies;
    @Mock BillingUsage usage;
    @Mock AuditService audit;
    @Mock EntityManager em;
    @InjectMocks CompanyService service;
    AutoCloseable mocks;
    Organization org; Company root,branch;
    @BeforeEach void setup() {
        mocks=MockitoAnnotations.openMocks(this); ReflectionTestUtils.setField(service,"entityManager",em);
        org=new Organization(); org.setId(1L); org.setSubscriptionPlan(SubscriptionPlan.FREE);
        root=new Company(); root.setId(10L); root.setName("Head Office"); root.setOrganization(org); root.setBranchLimit(Integer.MAX_VALUE);
        branch=branch(11L); when(companies.findById(10L)).thenReturn(Optional.of(root));
        when(companies.findById(11L)).thenReturn(Optional.of(branch));
    }
    Company branch(Long id) {
        var result=new Company(); result.setId(id); result.setCompanyType(Company.CompanyType.BRANCH);
        result.setOrganization(org); result.setParentCompany(root); result.setParentCompanyId(10L);
        result.setActive(false); result.setStatus(Company.CompanyStatus.INACTIVE); return result;
    }
    @AfterEach void clear() throws Exception { mocks.close(); }
    void unchanged() { assertThat(branch.isActive()).isFalse(); verify(companies,never()).saveAll(any()); verifyNoInteractions(audit); }
    @Test void freeCannotRestoreASecondBranch() {
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(1L);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class).hasMessageContaining("branch limit of 1"); unchanged();
    }
    @Test void basicCannotRestoreAThirdBranch() {
        org.setSubscriptionPlan(SubscriptionPlan.BASIC);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(2L);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class).hasMessageContaining("branch limit of 2"); unchanged();
    }
    @Test void standardCanRestoreItsFifthBranchUnderTheSharedOrganizationLock() {
        org.setSubscriptionPlan(SubscriptionPlan.STANDARD);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(4L);
        service.restore(11L); assertThat(branch.isActive()).isTrue();
        var order=inOrder(em,usage,companies);
        order.verify(em).refresh(org,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        order.verify(usage).validateRestoration(1L,SubscriptionPlan.STANDARD,List.of(11L),null);
        order.verify(companies).saveAll(any());
    }
    @Test void standardCannotRestoreItsSixthBranch() {
        org.setSubscriptionPlan(SubscriptionPlan.STANDARD);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(5L);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class); unchanged();
    }
    @Test void enterpriseHasNoArtificialPlanBranchCap() {
        org.setSubscriptionPlan(SubscriptionPlan.ENTERPRISE);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(1000L);
        service.restore(11L); assertThat(branch.isActive()).isTrue();
    }
    @Test void customHeadOfficeLimitStillApplies() {
        org.setSubscriptionPlan(SubscriptionPlan.ENTERPRISE); root.setBranchLimit(1);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(1L);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class); unchanged();
    }
    @Test void overLimitHeadOfficeTreeIsRejectedBeforeAnyFlagsChange() {
        root.setActive(false); root.setStatus(Company.CompanyStatus.INACTIVE);
        var second=branch(12L); when(companies.findByParentCompanyId(10L)).thenReturn(List.of(branch,second));
        assertThatThrownBy(() -> service.restore(10L)).isInstanceOf(BadRequestException.class);
        unchanged(); assertThat(root.isActive()).isFalse(); assertThat(second.isActive()).isFalse();
    }
    @Test void fittingHeadOfficeAndAllBranchesRestoreTogether() {
        org.setSubscriptionPlan(SubscriptionPlan.BASIC); root.setActive(false); root.setStatus(Company.CompanyStatus.INACTIVE);
        var second=branch(12L); when(companies.findByParentCompanyId(10L)).thenReturn(List.of(branch,second));
        service.restore(10L);
        assertThat(root.isActive()).isTrue(); assertThat(branch.isActive()).isTrue(); assertThat(second.isActive()).isTrue();
        verify(usage).validateRestoration(1L,SubscriptionPlan.BASIC,List.of(11L,12L,10L),null);
        verify(companies).saveAll(argThat(items -> ((List<?>)items).size()==3));
    }
    @Test void employeeOverflowPreventsBranchRestoration() {
        doThrow(new BillingFailure(409,"Employee limit exceeded")).when(usage).validateRestoration(1L,SubscriptionPlan.FREE,List.of(11L),null);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BillingFailure.class); unchanged();
    }
    @Test void alreadyActiveBranchDoesNotConsumeAnotherBranchSlot() {
        branch.setActive(true); branch.setStatus(Company.CompanyStatus.ACTIVE);
        when(companies.countByParentCompanyIdAndIsActiveTrue(10L)).thenReturn(1L);
        service.restore(11L); verify(companies).saveAll(any());
    }
    @Test void branchCannotRestoreWhileItsHeadOfficeRemainsInactive() {
        root.setActive(false); root.setStatus(Company.CompanyStatus.INACTIVE);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class).hasMessageContaining("Head Office"); unchanged();
    }
    @Test void suspendedOrganizationCannotBeReactivatedThroughCompanyRestore() {
        org.setStatus(Organization.OrgStatus.SUSPENDED);
        assertThatThrownBy(() -> service.restore(11L)).isInstanceOf(BadRequestException.class).hasMessageContaining("organization"); unchanged();
    }
}
