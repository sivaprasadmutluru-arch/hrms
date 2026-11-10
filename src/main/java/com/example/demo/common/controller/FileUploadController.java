package com.example.demo.common.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@Tag(name = "File Upload")
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final CompanyRepository companyRepository;
    private final com.example.demo.base.repository.OrganizationRepository organizationRepository;
    private final com.example.demo.auth.repository.UserRoleRepository userRoleRepository;

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
     * Stored under {orgSlug}/documents/ to keep files org-scoped.
     */
    @PostMapping("/document")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a document file")
    public ResponseEntity<Map<String, String>> uploadDocument(@RequestParam("file") MultipartFile file) {
        String orgSlug = resolveOrgSlug();
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "documents");
        return ResponseEntity.ok(Map.of("path", path, "url", "/api/files/" + path));
    }

    private String resolveOrgSlug() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && scope.getCompanyId() != null) {
            return companyRepository.findOrganizationSlugByCompanyId(scope.getCompanyId())
                    .orElse("default");
        }
        return "default";
    }

    /**
     * Serve a stored file by its relative path.
     * Handles paths of any depth: subDir/file.png or orgSlug/subDir/file.png
     * Public visual assets (logos, profile photos) are served without restriction.
     * Sensitive files (documents, attachments, letters, stamps) require authentication
     * and tenant verification.
     */
    @GetMapping("/{*filePath}")
    @Operation(summary = "Serve a stored file")
    public ResponseEntity<Resource> serveFile(@PathVariable String filePath) throws IOException {
        String relativePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;

        // Path traversal protection
        Path resolvedPath = fileUploadService.resolve(relativePath);
        Path uploadRoot = fileUploadService.resolve("").toAbsolutePath().normalize();
        Path absolutePath = resolvedPath.toAbsolutePath().normalize();
        if (!absolutePath.startsWith(uploadRoot) || absolutePath.startsWith(uploadRoot.resolve("carr-private"))) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }

        // Check whether file is a public visual asset
        if (!isPublicAsset(relativePath)) {
            org.springframework.security.core.Authentication auth =
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()
                    || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
            }

            // Tenant isolation for org-scoped files
            String[] parts = relativePath.split("/");
            if (parts.length > 1) {
                String possibleOrgSlug = parts[0];
                var orgOpt = organizationRepository.findBySlug(possibleOrgSlug);
                if (orgOpt.isPresent()) {
                    Long orgId = orgOpt.get().getId();
                    boolean isPlatformAdmin = auth.getAuthorities().stream().anyMatch(a ->
                            a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
                    if (!isPlatformAdmin && auth.getPrincipal() instanceof com.example.demo.auth.security.UserPrincipal principal) {
                        boolean hasAccess = userRoleRepository.findByUserId(principal.getId()).stream()
                                .anyMatch(ur -> ur.getCompany() != null
                                        && ur.getCompany().getOrganization() != null
                                        && orgId.equals(ur.getCompany().getOrganization().getId()));
                        if (!hasAccess) {
                            log.warn("Access denied for user {} to tenant file in organization {}",
                                    principal.getUsername(), possibleOrgSlug);
                            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
                        }
                    }
                }
            }
        }

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

    private boolean isPublicAsset(String path) {
        String lower = path.toLowerCase();
        return lower.startsWith("profile-photos/") || lower.contains("/profile-photos/")
                || lower.startsWith("logos/") || lower.contains("/logos/");
    }
}
