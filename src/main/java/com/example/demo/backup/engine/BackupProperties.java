package com.example.demo.backup.engine;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
@Getter @Setter @Component @ConfigurationProperties("backup")
public class BackupProperties {
 private String directory="./.runtime/backups";
 private String encryptionKeyFile="./.runtime/backup-encryption.key";
 private String pgDump="pg_dump";
 private String pgRestore="pg_restore";
 private int timeoutSeconds=1800;
 private String driveServiceAccountFile="";
 private String driveFolderId="";
}
