package com.example.demo.leave.controller;

import com.example.demo.leave.service.LeaveAttachmentService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/leave/requests")
public class LeaveAttachmentController {
    private final LeaveAttachmentService attachments;

    public LeaveAttachmentController(LeaveAttachmentService attachments) {
        this.attachments = attachments;
    }

    @GetMapping("/{requestId}/files/{fileId}/content")
    @PreAuthorize("hasAuthority('leave:view')")
    public ResponseEntity<Resource> content(@PathVariable Long requestId, @PathVariable Long fileId,
            @RequestParam(defaultValue = "true") boolean download) {
        var file = attachments.content(requestId, fileId);
        boolean inline = !download && !file.contentType().equals("application/octet-stream");
        var disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(file.name(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(new FileSystemResource(file.path()));
    }
}
