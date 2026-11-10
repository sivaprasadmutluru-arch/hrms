package com.example.demo.backup.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service @RequiredArgsConstructor
public class BackupManager {
 private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final DataSource dataSource;
 private final BackupCommands commands;private final BackupDrive drive;private final BackupEngine engine;private final BackupArchive archive;private final ObjectMapper json;
 private final ExecutorService worker=Executors.newSingleThreadExecutor(r->{var t=new Thread(r,"backup-worker");t.setDaemon(true);return t;});private final AtomicBoolean working=new AtomicBoolean();
 public record Settings(boolean databaseEnabled,boolean mediaEnabled,boolean driveEnabled,boolean scheduleEnabled,@NotNull @Pattern(regexp="DAILY|WEEKLY|MONTHLY") String frequency,@Min(0) @Max(23) int hour,@Min(0) @Max(59) int minute,@NotBlank @Size(max=80) String timezone){}
 public Settings settings(){return jdbc.queryForObject("SELECT * FROM public.backup_settings WHERE id=1",(rs,n)->new Settings(rs.getBoolean("database_enabled"),rs.getBoolean("media_enabled"),rs.getBoolean("drive_enabled"),rs.getBoolean("schedule_enabled"),rs.getString("frequency"),rs.getInt("hour"),rs.getInt("minute"),rs.getString("timezone")));}
 public Map<String,Object> overview(){var data=new LinkedHashMap<String,Object>();data.put("settings",settings());data.put("nextRunAt",jdbc.queryForObject("SELECT next_run_at FROM public.backup_settings WHERE id=1",java.sql.Timestamp.class));data.put("databaseAvailable",commands.available());data.put("driveConfigured",drive.configured());data.put("jobs",jdbc.queryForList("SELECT id,status,source,requested_by,created_at,started_at,finished_at,filename,bytes,sha256,verified_at,error,drive_status,drive_file_id FROM public.backup_jobs ORDER BY created_at DESC LIMIT 50"));return data;}
 private void validate(Settings s){if(!s.databaseEnabled() && !s.mediaEnabled())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose database, media, or both");try{ZoneId.of(s.timezone());}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Select a valid schedule time zone");}if(s.databaseEnabled() && !commands.available())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"PostgreSQL backup tools are not configured on the server");if(s.driveEnabled() && !drive.configured())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Google Drive server credentials and Shared Drive folder must be configured first");}
 public Map<String,Object> save(Settings s,String actor){validate(s);Instant next=s.scheduleEnabled()?nextRun(s,Instant.now()):null;jdbc.update("UPDATE public.backup_settings SET database_enabled=?,media_enabled=?,drive_enabled=?,schedule_enabled=?,frequency=?,hour=?,minute=?,timezone=?,next_run_at=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1",s.databaseEnabled(),s.mediaEnabled(),s.driveEnabled(),s.scheduleEnabled(),s.frequency(),s.hour(),s.minute(),s.timezone(),timestamp(next),actor);return overview();}
 public static Instant nextRun(Settings s,Instant now){ZoneId zone=ZoneId.of(s.timezone());var date=now.atZone(zone).toLocalDate();var time=LocalTime.of(s.hour(),s.minute());var next=date.atTime(time).atZone(zone);switch(s.frequency()) {case "WEEKLY"->next=date.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY)).atTime(time).atZone(zone);case "MONTHLY"->next=date.withDayOfMonth(1).atTime(time).atZone(zone);case "DAILY"->{}default->throw new IllegalArgumentException("Unknown backup frequency");}if(!next.toInstant().isAfter(now))next=switch(s.frequency()){case "WEEKLY"->next.plusWeeks(1);case "MONTHLY"->next.plusMonths(1);default->next.plusDays(1);};return next.toInstant();}
 private static java.sql.Timestamp timestamp(Instant i){return i==null?null:java.sql.Timestamp.from(i);}
 public UUID request(String actor){UUID id=tx.execute(status->{jdbc.queryForObject("SELECT pg_advisory_xact_lock(824701)",Object.class);var active=jdbc.queryForList("SELECT id FROM public.backup_jobs WHERE status IN ('QUEUED','RUNNING')",UUID.class);if(!active.isEmpty())return active.getFirst();Settings settings=settings();validate(settings);return enqueue(settings,"MANUAL",actor);});dispatch();return id;}
 private UUID enqueue(Settings settings,String source,String actor){try{UUID id=UUID.randomUUID();jdbc.update("INSERT INTO public.backup_jobs(id,status,source,requested_by,settings_json,drive_status) VALUES(?,'QUEUED',?,?,?,?)",id,source,actor,json.writeValueAsString(settings),settings.driveEnabled()?"PENDING":"NOT_REQUESTED");return id;}catch(Exception e){throw new IllegalStateException("Unable to queue backup",e);}}
 @Scheduled(fixedDelay=30000,initialDelay=10000) public void tick(){
  try{tx.executeWithoutResult(status->{jdbc.queryForObject("SELECT pg_advisory_xact_lock(824701)",Object.class);if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(824702)",Boolean.class))) jdbc.update("UPDATE public.backup_jobs SET status='FAILED',finished_at=CURRENT_TIMESTAMP,error='Backup worker stopped before completion; run a new backup' WHERE status='RUNNING'");var row=jdbc.queryForMap("SELECT schedule_enabled,next_run_at FROM public.backup_settings WHERE id=1 FOR UPDATE");var due=(java.sql.Timestamp)row.get("next_run_at");if(Boolean.TRUE.equals(row.get("schedule_enabled")) && due!=null && !due.toInstant().isAfter(Instant.now())){Settings s=settings();if(jdbc.queryForObject("SELECT count(*) FROM public.backup_jobs WHERE status IN ('QUEUED','RUNNING')",Integer.class)==0)enqueue(s,"SCHEDULED","scheduled-backup");jdbc.update("UPDATE public.backup_settings SET next_run_at=? WHERE id=1",timestamp(nextRun(s,Instant.now())));}});dispatch();}catch(Exception e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Backup scheduling unavailable; check database migration and server configuration");}
 }
 private void dispatch(){if(working.compareAndSet(false,true))worker.submit(()->{try{executeNext();}finally{working.set(false);}});}
 private void executeNext(){
  try(var connection=dataSource.getConnection();var lock=connection.createStatement()){
   try(var rs=lock.executeQuery("SELECT pg_try_advisory_lock(824702)")){rs.next();if(!rs.getBoolean(1))return;}
   try{var queued=jdbc.queryForList("SELECT id,settings_json FROM public.backup_jobs WHERE status='QUEUED' ORDER BY created_at LIMIT 1");if(queued.isEmpty())return;var job=queued.getFirst();UUID id=(UUID)job.get("id");jdbc.update("UPDATE public.backup_jobs SET status='RUNNING',started_at=CURRENT_TIMESTAMP WHERE id=?",id);
    try{Settings s=json.readValue((String)job.get("settings_json"),Settings.class);validate(s);var result=engine.create(id,s.databaseEnabled(),s.mediaEnabled());jdbc.update("UPDATE public.backup_jobs SET filename=?,bytes=?,sha256=?,verified_at=CURRENT_TIMESTAMP WHERE id=?",result.filename(),result.bytes(),result.sha256(),id);
     if(s.driveEnabled()){try{String driveId=drive.upload(engine.file(result.filename()));jdbc.update("UPDATE public.backup_jobs SET drive_status='UPLOADED',drive_file_id=? WHERE id=?",driveId,id);}catch(Exception e){jdbc.update("UPDATE public.backup_jobs SET status='PARTIAL',drive_status='FAILED',error='Local backup verified; Google Drive upload failed. Check server credentials and folder permissions.',finished_at=CURRENT_TIMESTAMP WHERE id=?",id);return;}}
     jdbc.update("UPDATE public.backup_jobs SET status='SUCCEEDED',finished_at=CURRENT_TIMESTAMP WHERE id=?",id);
    }catch(Exception e){String message=e instanceof IllegalStateException && e.getMessage()!=null?e.getMessage():"Backup failed. Check database tools, media storage, free space and encryption key.";jdbc.update("UPDATE public.backup_jobs SET status='FAILED',error=?,finished_at=CURRENT_TIMESTAMP WHERE id=?",message.substring(0,Math.min(1000,message.length())),id);}
   }finally{lock.execute("SELECT pg_advisory_unlock(824702)");}
  }catch(Exception e){org.slf4j.LoggerFactory.getLogger(getClass()).error("Backup worker could not update job status; check database connectivity");}
 }
 public Path download(UUID id) throws Exception {var rows=jdbc.queryForList("SELECT filename,sha256 FROM public.backup_jobs WHERE id=? AND status IN ('SUCCEEDED','PARTIAL')",id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Completed backup not found");var job=rows.getFirst();Path path=engine.file((String)job.get("filename"));if(!BackupArchive.sha256(path).equals(job.get("sha256")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Backup checksum mismatch; file is not safe to download");return path;}
 public Map<String,String> verify(UUID id) throws Exception {Path file=download(id);archive.verify(file);jdbc.update("UPDATE public.backup_jobs SET verified_at=CURRENT_TIMESTAMP WHERE id=?",id);return Map.of("message","Encryption and archive checksums verified. A separate restore drill is still required.");}
 @PreDestroy void stop(){worker.shutdownNow();}
}
