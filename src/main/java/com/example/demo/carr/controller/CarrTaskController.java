package com.example.demo.carr.controller;

import com.example.demo.carr.dto.CarrTaskDtos.*;
import com.example.demo.carr.dto.CarrDtos.AuditResponse;
import com.example.demo.carr.service.CarrTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/carr/tasks") @RequiredArgsConstructor @PreAuthorize("isAuthenticated()")
public class CarrTaskController {
    private final CarrTaskService service;
    private final com.example.demo.common.service.FileUploadService files;
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<java.util.Map<String,String>> concurrentUpdate() {
        return ResponseEntity.status(409).body(java.util.Map.of("message","This task changed. Refresh before trying again."));
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<java.util.Map<String, Object>> invalidTaskBody() {
        return ResponseEntity.badRequest().body(java.util.Map.of("status", 400,
                "message", "Invalid task data. Check the status, dates and numeric fields."));
    }
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<java.util.Map<String, Object>> taskError(org.springframework.web.server.ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(java.util.Map.of("status", ex.getStatusCode().value(),
                "message", java.util.Objects.toString(ex.getReason(), "Task request failed")));
    }
    @GetMapping public List<TaskResponse> list(@RequestParam(defaultValue="false") boolean mine, Authentication auth) { return service.list(auth,mine); }
    @GetMapping("/{id}") public TaskDetail detail(@PathVariable Long id, Authentication auth) { return service.detail(id,auth); }
    @PatchMapping("/{id}/checklist/{itemId}") public TaskResponse checklist(@PathVariable Long id,@PathVariable String itemId,@Valid @RequestBody ChecklistRequest request,Authentication auth) { return service.checklist(id,itemId,request,auth); }
    @PostMapping("/{id}/comments") public TaskDetail comment(@PathVariable Long id, @Valid @RequestBody CommentRequest request, Authentication auth) { return service.comment(id,request,auth); }
    @PostMapping("/{id}/review") public TaskResponse review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request, Authentication auth) { return service.review(id,request,auth); }
    @PostMapping("/{id}/attachments") public AttachmentResponse upload(@PathVariable Long id,
            @RequestParam org.springframework.web.multipart.MultipartFile file, @RequestParam(defaultValue="DELIVERABLE") String kind, Authentication auth) {
        com.example.demo.carr.entity.CarrTaskAttachment.Kind type;
        try { type=com.example.demo.carr.entity.CarrTaskAttachment.Kind.valueOf(kind); }
        catch(IllegalArgumentException ex) { throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid task file type"); }
        return service.upload(id,file,type,auth);
    }
    @GetMapping("/{id}/attachments/{attachmentId}") public ResponseEntity<byte[]> download(@PathVariable Long id,@PathVariable Long attachmentId,Authentication auth) {
        var attachment=service.attachment(id,attachmentId,auth);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(attachment.getFilename(),java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options","nosniff").body(files.readBytes(attachment.getStoragePath()));
    }
    @GetMapping("/options") public TaskOptions options(Authentication auth) { return service.options(auth); }
    @PostMapping public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, auth));
    }
    @PutMapping("/{id}") public TaskResponse update(@PathVariable Long id, @Valid @RequestBody TaskRequest request, Authentication auth) { return service.update(id, request, auth); }
    @PatchMapping("/{id}/details") public TaskResponse details(@PathVariable Long id, @Valid @RequestBody DetailsRequest request, Authentication auth) { return service.details(id, request, auth); }
    @PatchMapping("/{id}/progress") public TaskResponse progress(@PathVariable Long id, @Valid @RequestBody ProgressRequest request, Authentication auth) { return service.progress(id, request, auth); }
    @GetMapping("/{id}/activity") public List<AuditResponse> activity(@PathVariable Long id, Authentication auth) { return service.activity(id, auth); }
}
