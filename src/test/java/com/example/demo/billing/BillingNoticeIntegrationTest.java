package com.example.demo.billing;
import com.example.demo.base.entity.*;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
@SpringBootTest(properties="app.billing.notices.enabled=false") @Transactional
class BillingNoticeIntegrationTest {
 @Autowired EntityManager em; @Autowired JdbcTemplate jdbc; @Autowired BillingNoticeDispatcher dispatcher;
 @MockBean EmailService email;
 Organization org;Company company;BillingSubscription subscription;
 @BeforeEach void setup(){TenantContext.clear();org=new Organization();org.setName("Notice fixture "+UUID.randomUUID());org.setSlug("notice-"+UUID.randomUUID());org.setContactEmail("billing@example.invalid");em.persist(org);company=new Company();company.setName("Notice company");company.setOrganization(org);company.setSchemaName("public");company.setSchemaReady(true);company.setEmail("fallback@example.invalid");em.persist(company);subscription=new BillingSubscription();subscription.setOrganizationId(org.getId());subscription.setPlan(SubscriptionPlan.BASIC);subscription.setLegacyAccess(false);subscription.setManualAccess(true);subscription.setPaidUntil(Instant.now().minusSeconds(60));em.persist(subscription);em.flush();}
 @AfterEach void clear(){TenantContext.clear();}
 String status(){return jdbc.queryForObject("SELECT status FROM public.billing_notices WHERE organization_id=? ORDER BY created_at DESC LIMIT 1",String.class,org.getId());}
 @Test void expiryUsesApprovedContactAndDurablyDeduplicatesThePeriod(){when(email.sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull())).thenReturn(true);assertThat(dispatcher.processOrganization(org.getId())).isTrue();assertThat(status()).isEqualTo("SENT");assertThat(dispatcher.processOrganization(org.getId())).isFalse();verify(email,times(1)).sendEmail(eq(company.getId()),eq("billing@example.invalid"),contains("expired"),contains("activated manually"),isNull());}
 @Test void failedEmailRetriesWithBackoffAndStopsAfterFiveAttempts(){when(email.sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull())).thenReturn(false);dispatcher.processOrganization(org.getId());assertThat(status()).isEqualTo("FAILED");assertThat(dispatcher.processOrganization(org.getId())).isFalse();jdbc.update("UPDATE public.billing_notices SET next_attempt_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE organization_id=?",org.getId());dispatcher.processOrganization(org.getId());assertThat(jdbc.queryForObject("SELECT attempts FROM public.billing_notices WHERE organization_id=?",Integer.class,org.getId())).isEqualTo(2);jdbc.update("UPDATE public.billing_notices SET attempts=5,next_attempt_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE organization_id=?",org.getId());assertThat(dispatcher.processOrganization(org.getId())).isFalse();verify(email,times(2)).sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull());}
 @Test void headOfficeEmailIsTheExplicitFallback(){org.setContactEmail(null);em.flush();when(email.sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull())).thenReturn(true);dispatcher.processOrganization(org.getId());verify(email).sendEmail(eq(company.getId()),eq("fallback@example.invalid"),anyString(),anyString(),isNull());}
 @Test void missingContactsAreTrackedWithoutSending(){org.setContactEmail(null);company.setEmail(null);em.flush();dispatcher.processOrganization(org.getId());assertThat(status()).isEqualTo("FAILED");verifyNoInteractions(email);}
 @Test void ambiguousSendingClaimsAreNeverAutomaticallyResent(){when(email.sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull())).thenReturn(false);dispatcher.processOrganization(org.getId());jdbc.update("UPDATE public.billing_notices SET status='SENDING',next_attempt_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE organization_id=?",org.getId());assertThat(dispatcher.processOrganization(org.getId())).isFalse();verify(email,times(1)).sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull());}
 @Test void newPeriodCanNotifyWithoutResendingOldPeriod(){when(email.sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull())).thenReturn(true);dispatcher.processOrganization(org.getId());subscription.setPaidUntil(Instant.now().plusSeconds(7*86400));em.flush();dispatcher.processOrganization(org.getId());assertThat(jdbc.queryForObject("SELECT count(*) FROM public.billing_notices WHERE organization_id=?",Long.class,org.getId())).isEqualTo(2L);verify(email,times(2)).sendEmail(anyLong(),anyString(),anyString(),anyString(),isNull());}
 @Test void freeAndLegacyPlansNeverQueueNotices(){subscription.setPlan(SubscriptionPlan.FREE);em.flush();assertThat(dispatcher.processOrganization(org.getId())).isFalse();subscription.setPlan(SubscriptionPlan.BASIC);subscription.setLegacyAccess(true);em.flush();assertThat(dispatcher.processOrganization(org.getId())).isFalse();verifyNoInteractions(email);}
}
