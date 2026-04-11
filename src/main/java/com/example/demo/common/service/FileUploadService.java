package com.example.demo.common.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class FileUploadService {

    @Value("${file.upload-dir:./media}")
    private String uploadDir;

    /**
     * Store a file under a sub-directory and return the relative URL path.
     *
     * @param file      the multipart file to store
     * @param subDir    sub-directory within the upload root (e.g. "profile-photos", "documents")
     * @return relative path like "profile-photos/abc123_filename.png"
     */
    public String store(MultipartFile file, String subDir) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload"
        );

        // Prevent path traversal attacks
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("Filename contains invalid path sequence: " + originalFilename);
        }

        String uniqueName = UUID.randomUUID() + "_" + originalFilename;
        Path targetDir = Paths.get(uploadDir).resolve(subDir).normalize();
        Path targetFile = targetDir.resolve(uniqueName);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + originalFilename, e);
        }

        return subDir + "/" + uniqueName;
    }

    /**
     * Delete a previously stored file by its relative path.
     */
    public void delete(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        Path target = Paths.get(uploadDir).resolve(relativePath).normalize();
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Failed to delete file {}: {}", relativePath, e.getMessage());
        }
    }

    /**
     * Store a file scoped to an organization's folder.
     * Files are stored under: {uploadDir}/{orgSlug}/{subDir}/
     *
     * @param file    the multipart file to store
     * @param orgSlug the organization slug (e.g. "abc-corp"), used as the top-level folder
     * @param subDir  sub-directory within the org folder (e.g. "logos", "employees")
     * @return relative path like "abc-corp/logos/uuid_file.png"
     */
    public String storeOrgScoped(MultipartFile file, String orgSlug, String subDir) {
        String safeSlug = orgSlug.toLowerCase().replaceAll("[^a-z0-9_-]", "-");
        return store(file, safeSlug + "/" + subDir);
    }

    /**
     * Resolve a relative path to a fully qualified file system path (for serving).
     */
    public Path resolve(String relativePath) {
        return Paths.get(uploadDir).resolve(relativePath).normalize();
    }
}
