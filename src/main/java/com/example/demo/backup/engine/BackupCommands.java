package com.example.demo.backup.engine;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.file.*;
import java.net.URI;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Component @RequiredArgsConstructor
public class BackupCommands {
 private final BackupProperties properties;
 @Value("${spring.datasource.url}") private String url;
 @Value("${spring.datasource.username}") private String username;
 @Value("${spring.datasource.password:}") private String password;
 public boolean available(){return executable(properties.getPgDump()) && executable(properties.getPgRestore());}
 private boolean executable(String binary){Path path=Path.of(binary);if(path.isAbsolute() || binary.contains("/"))return Files.isExecutable(path);return Arrays.stream(System.getenv().getOrDefault("PATH","").split(":" )).anyMatch(dir->Files.isExecutable(Path.of(dir,binary)));}
 public void dump(Path target,Path log) throws Exception {
  URI db=URI.create(url.replaceFirst("^jdbc:",""));if(!"postgresql".equals(db.getScheme()) || db.getHost()==null)throw new IllegalStateException("PostgreSQL datasource URL required");
  List<String> args=new ArrayList<>(List.of(properties.getPgDump(),"--format=custom","--no-owner","--no-acl","--no-password","--host",db.getHost(),"--port",String.valueOf(db.getPort()<0?5432:db.getPort()),"--username",username,"--dbname",db.getPath().substring(1)));
  // Stream stdout to a private file; no credentials or data are returned to the UI.
  ProcessBuilder builder=new ProcessBuilder(args).redirectOutput(target.toFile()).redirectError(log.toFile());builder.environment().put("PGPASSWORD",password);builder.environment().put("PGCONNECT_TIMEOUT","15");String ssl=Arrays.stream(Objects.toString(db.getQuery(),"").split("&")).filter(p->p.startsWith("sslmode=")).map(p->p.substring(8)).findFirst().orElse(null);if(ssl!=null)builder.environment().put("PGSSLMODE",ssl);
  run(builder,log);BackupArchive.privateFile(target);if(Files.size(target)<32)throw new IllegalStateException("Database backup is empty");
 }
 public void verifyDump(Path dump,Path log) throws Exception {run(new ProcessBuilder(properties.getPgRestore(),"--list").redirectInput(dump.toFile()).redirectOutput(ProcessBuilder.Redirect.DISCARD).redirectError(log.toFile()),log);}
 private void run(ProcessBuilder builder,Path log) throws Exception {var process=builder.start();BackupArchive.privateFile(log);try{if(!process.waitFor(properties.getTimeoutSeconds(),TimeUnit.SECONDS)){process.descendants().forEach(ProcessHandle::destroyForcibly);process.destroyForcibly();throw new IllegalStateException("Database backup command timed out");}if(process.exitValue()!=0)throw new IllegalStateException("Database backup command failed; check PostgreSQL client version and server configuration");}catch(InterruptedException e){process.descendants().forEach(ProcessHandle::destroyForcibly);process.destroyForcibly();Thread.currentThread().interrupt();throw e;}}
}
