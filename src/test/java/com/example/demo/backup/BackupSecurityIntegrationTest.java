package com.example.demo.backup;
import com.example.demo.backup.controller.BackupController;
import com.example.demo.backup.engine.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties={"backup.pg-dump=/usr/bin/true","backup.pg-restore=/usr/bin/true"}) @Transactional
@Sql("/db/migration/V48__backup_jobs.sql")
class BackupSecurityIntegrationTest {
 @Autowired BackupController controller;@Autowired BackupManager manager;
 void login(String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("backup-fixture",null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));}
 BackupManager.Settings settings(boolean database,boolean media,boolean drive){return new BackupManager.Settings(database,media,drive,false,"DAILY",2,0,"UTC");}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @Test void platformAdministratorCanReadBackupStatus(){login("PLATFORM_SUPER_ADMIN");assertThat(controller.status()).containsKeys("settings","jobs","databaseAvailable","driveConfigured");}
 @Test void customerAdministratorsCannotReadPlatformBackups(){for(String role:List.of("ENTERPRISE_ADMIN","BRANCH_ADMIN","EMPLOYEE","PLATFORM_SUPPORT","PLATFORM_BILLING","PLATFORM_ORGANIZATION_OPERATIONS")){login(role);assertThatThrownBy(()->controller.status()).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}}
 @Test void customerAdministratorsCannotDownloadOrVerifyBackup(){login("ENTERPRISE_ADMIN");assertThatThrownBy(()->controller.download(UUID.randomUUID())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->controller.verify(UUID.randomUUID())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void customerAdministratorsCannotChangeSettingsOrRunBackup(){login("ENTERPRISE_ADMIN");assertThatThrownBy(()->controller.save(settings(true,true,false),SecurityContextHolder.getContext().getAuthentication())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->controller.run(SecurityContextHolder.getContext().getAuthentication())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void noSelectionIsRejected(){assertThatThrownBy(()->manager.save(settings(false,false,false),"fixture")).hasMessageContaining("Choose database");}
 @Test void unconfiguredDriveCannotBeEnabled(){assertThatThrownBy(()->manager.save(settings(true,true,true),"fixture")).hasMessageContaining("Google Drive");}
 @Test void unknownTimezoneIsRejected(){var s=new BackupManager.Settings(true,true,false,true,"DAILY",2,0,"Invalid/Zone");assertThatThrownBy(()->manager.save(s,"fixture")).hasMessageContaining("time zone");}
 @Test void missingBackupCannotBeDownloaded(){assertThatThrownBy(()->manager.download(UUID.randomUUID())).hasMessageContaining("not found");}
 @Test void repeatedRequestReusesActiveJob(){var first=manager.request("fixture");var second=manager.request("fixture");assertThat(second).isEqualTo(first);}
 @Test void savedScheduleHasNextRunAndCanBeDisabled(){var s=new BackupManager.Settings(true,true,false,true,"WEEKLY",2,0,"Asia/Kolkata");var result=manager.save(s,"fixture");assertThat(result.get("nextRunAt")).isNotNull();result=manager.save(settings(true,true,false),"fixture");assertThat(result.get("nextRunAt")).isNull();}
}
