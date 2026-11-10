package com.example.demo.backup.controller;
import com.example.demo.backup.engine.BackupManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/backup") @RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
public class BackupController {
 private final BackupManager manager;
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
 public ResponseEntity<Map<String,String>> failure(org.springframework.web.server.ResponseStatusException error){return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",java.util.Objects.toString(error.getReason(),"Backup request failed")));}
 @GetMapping public Map<String,Object> status(){return manager.overview();}
 @PutMapping("/settings") public Map<String,Object> save(@Valid @RequestBody BackupManager.Settings settings,Authentication auth){return manager.save(settings,auth.getName());}
 @PostMapping("/run") public ResponseEntity<Map<String,Object>> run(Authentication auth){return ResponseEntity.accepted().body(Map.of("id",manager.request(auth.getName()),"message","Backup queued"));}
 @GetMapping("/jobs/{id}/download") public ResponseEntity<FileSystemResource> download(@PathVariable UUID id) throws Exception {var file=manager.download(id);return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(file.getFileName().toString()).build().toString()).header(HttpHeaders.CACHE_CONTROL,"no-store").contentType(MediaType.APPLICATION_OCTET_STREAM).body(new FileSystemResource(file));}
 @PostMapping("/jobs/{id}/verify") public Map<String,String> verify(@PathVariable UUID id) throws Exception {return manager.verify(id);}
}
