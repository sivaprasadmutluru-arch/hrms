package com.example.demo.common.controller;

import com.example.demo.common.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Tag(name = "File Upload")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * Generic file upload endpoint.
     * @param file    the file to upload
     * @param subDir  the sub-directory to store under (default: "uploads")
     * @return JSON with the relative file path
     */
    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a file and get its path")
    public ResponseEntity<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dir", defaultValue = "uploads") String subDir) {
        String path = fileUploadService.store(file, subDir);
        return ResponseEntity.ok(Map.of("path", path, "url", "/api/files/" + path));
    }

    /**
     * Upload a profile photo specifically.
     */
    @PostMapping("/profile-photo")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a profile photo")
    public ResponseEntity<Map<String, String>> uploadProfilePhoto(@RequestParam("file") MultipartFile file) {
        String path = fileUploadService.store(file, "profile-photos");
        return ResponseEntity.ok(Map.of("path", path, "url", "/api/files/" + path));
    }

    /**
     * Upload a document (leave file, reimbursement attachment, etc.).
     */
    @PostMapping("/document")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a document file")
    public ResponseEntity<Map<String, String>> uploadDocument(@RequestParam("file") MultipartFile file) {
        String path = fileUploadService.store(file, "documents");
        return ResponseEntity.ok(Map.of("path", path, "url", "/api/files/" + path));
    }

    /**
     * Serve a stored file by its relative path.
     * Handles paths of any depth: subDir/file.png or orgSlug/subDir/file.png
     */
    @GetMapping("/{*filePath}")
    @Operation(summary = "Serve a stored file")
    public ResponseEntity<Resource> serveFile(@PathVariable String filePath) throws IOException {
        String relativePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
        Path resolvedPath = fileUploadService.resolve(relativePath);
        Resource resource = new UrlResource(resolvedPath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }
        String contentType = java.nio.file.Files.probeContentType(resolvedPath);
        if (contentType == null) contentType = "application/octet-stream";
        String filename = resolvedPath.getFileName().toString();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
