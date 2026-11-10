package com.example.demo.platformops;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import java.util.*;import java.nio.charset.StandardCharsets;import javax.crypto.*;import javax.crypto.spec.SecretKeySpec;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.billing.notices.enabled=false","app.website.enquiry-secret=website-integration-test-key-not-production-123456"}) @AutoConfigureMockMvc @Transactional
@Sql("/db/migration/V39__website_enquiries.sql")
class WebsiteEnquiryIntegrationTest {
 @Autowired MockMvc mvc;@Autowired WebsiteEnquiryController controller;
 String body(){long n=System.currentTimeMillis();return "{\"reference\":\"SHV-AABB1122\",\"name\":\"Website fixture\",\"email\":\"fixture@example.invalid\",\"phone\":\"\",\"category\":\"AccrueHR registration\",\"message\":\"Organization: Fixture\\nRequest a registration discussion.\",\"createdAt\":"+n+",\"consentAt\":"+n+"}";}
 String sign(String stamp,String body)throws Exception{var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec("website-integration-test-key-not-production-123456".getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal((stamp+"."+body).getBytes(StandardCharsets.UTF_8)));}
 String stamp(){return String.valueOf(java.time.Instant.now().getEpochSecond());}
 void admin(){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-admin",null,List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 @Test void signedWebsitePostIsPersistedAndIdempotent()throws Exception{String b=body(),t=stamp();for(int i=0;i<2;i++)mvc.perform(post("/api/public/website-enquiries").contentType("application/json").header("X-Accrue-Timestamp",t).header("X-Accrue-Signature",sign(t,b)).content(b)).andExpect(status().isOk()).andExpect(jsonPath("$.received").value(true));admin();assertThat(controller.list(0,"","").get("total")).isEqualTo(1L);}
 @Test void missingOrInvalidSignatureCannotStoreEnquiries()throws Exception{mvc.perform(post("/api/public/website-enquiries").contentType("application/json").content(body())).andExpect(status().isUnauthorized());String t=stamp();mvc.perform(post("/api/public/website-enquiries").contentType("application/json").header("X-Accrue-Timestamp",t).header("X-Accrue-Signature","0".repeat(64)).content(body())).andExpect(status().isUnauthorized());admin();assertThat(controller.list(0,"","").get("total")).isEqualTo(0L);}
 @Test void staleSignatureAndTamperedPayloadRejected()throws Exception{String b=body(),t=String.valueOf(java.time.Instant.now().getEpochSecond()-301);assertThatThrownBy(()->controller.accept(t,sign(t,b),b)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);String now=stamp();mvc.perform(post("/api/public/website-enquiries").contentType("application/json").header("X-Accrue-Timestamp",now).header("X-Accrue-Signature",sign(now,b)).content(b.replace("fixture@example.invalid","tampered@example.invalid"))).andExpect(status().isUnauthorized());}
 @Test void invalidFieldsAndDuplicateConflictsRejected()throws Exception{String b=body(),t=stamp();controller.accept(t,sign(t,b),b);String changed=b.replace("Website fixture","Other person");assertThatThrownBy(()->controller.accept(t,sign(t,changed),changed)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);String invalid=b.replace("AccrueHR registration","Unknown category");assertThatThrownBy(()->controller.accept(t,sign(t,invalid),invalid)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);}
 @Test void onlyPlatformCanReadOrUpdateInbox()throws Exception{String b=body(),t=stamp();controller.accept(t,sign(t,b),b);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("employee",null,List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))));assertThatThrownBy(()->controller.list(0,"","")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->controller.update("SHV-AABB1122",new WebsiteEnquiryController.Update("CONTACTED","Review"))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);admin();controller.update("SHV-AABB1122",new WebsiteEnquiryController.Update("CONTACTED","Discuss setup"));assertThat(controller.list(0,"CONTACTED","fixture").get("total")).isEqualTo(1L);}
}
