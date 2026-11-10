package com.example.demo.base.service;
import com.example.demo.base.dto.*;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.billing.BillingService;
import com.example.demo.auth.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import jakarta.validation.Validation;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationCountryTest {
 @Mock OrganizationRepository organizationRepository;@Mock CompanyService companyService;@Mock BillingService billingService;
 @Mock com.example.demo.platformops.PlatformTeamAccess platformTeam;
 @Mock com.example.demo.audit.AuditService platformAudit;
 @InjectMocks OrganizationService service;
 @BeforeEach void setup(){
     org.springframework.test.util.ReflectionTestUtils.setField(service,"billingService",billingService);
     org.springframework.test.util.ReflectionTestUtils.setField(service,"platformTeam",platformTeam);
     org.springframework.test.util.ReflectionTestUtils.setField(service,"platformAudit",platformAudit);
 }
 CreateOrganizationRequest request(){var r=new CreateOrganizationRequest();r.setName("Country fixture");r.setEmployeeRange(com.example.demo.base.enums.EmployeeRange.values()[0]);r.setAdminUsername("fixture");r.setAdminEmail("fixture@example.invalid");r.setAdminPassword("fixture-only-password");return r;}
 @Test void countryRequiredInApiValidation(){try(var factory=Validation.buildDefaultValidatorFactory()){var r=request();assertThat(factory.getValidator().validate(r)).anySatisfy(v->assertThat(v.getPropertyPath().toString()).isEqualTo("country"));r.setCountry("   ");assertThat(factory.getValidator().validate(r)).isNotEmpty();r.setCountry("India");assertThat(factory.getValidator().validate(r)).isEmpty();}}
 @Test void directServiceCannotCreateWithoutCountry(){assertThatThrownBy(()->service.createOrganization(request())).hasMessageContaining("country");verifyNoInteractions(organizationRepository,companyService,billingService);}
 @Test void invalidCountryLengthIsRejected(){var r=request();r.setCountry("a".repeat(101));assertThatThrownBy(()->service.createOrganization(r)).hasMessageContaining("country");verifyNoInteractions(organizationRepository,companyService,billingService);}
 @Test void chosenCountryIsStoredOnHeadOffice(){var r=request();r.setCountry("  United Arab Emirates  ");when(organizationRepository.findBySlug(anyString())).thenReturn(Optional.empty());when(organizationRepository.save(any())).thenAnswer(inv->{Organization org=inv.getArgument(0);org.setId(42L);return org;});var office=new Company();office.setId(337L);when(companyService.createHeadOffice(any())).thenReturn(office);service.createOrganization(r);var captor=ArgumentCaptor.forClass(CompanyRequest.class);verify(companyService).createHeadOffice(captor.capture());assertThat(captor.getValue().getCountry()).isEqualTo("United Arab Emirates");}
}
