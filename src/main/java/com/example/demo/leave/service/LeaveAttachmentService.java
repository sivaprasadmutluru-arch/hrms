package com.example.demo.leave.service;

import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.leave.entity.LeaveRequestFile;
import com.example.demo.leave.repository.LeaveRequestFileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class LeaveAttachmentService {
    private final LeaveService leaves;
    private final LeaveRequestFileRepository files;
    private final FileUploadService uploads;
    @Value("${app.upload.dir:uploads/leave}")
    private String legacyUploadDir;

    public LeaveAttachmentService(LeaveService leaves, LeaveRequestFileRepository files, FileUploadService uploads) {
        this.leaves = leaves;
        this.files = files;
        this.uploads = uploads;
    }

    public void requireRead(Long requestId) {
        var request = leaves.getRequestById(requestId);
        var scope = AccessScopeContext.get();
        Long companyId = request.getCompany().getId();
        if (scope == null || !scope.canAccess(companyId)
                || (scope.getFilterCompanyId() != null && !companyId.equals(scope.getFilterCompanyId()))) {
            throw new AccessDeniedException("You cannot access this leave attachment");
        }
        boolean owner = request.getEmployee().getUser() != null
                && request.getEmployee().getUser().getId().equals(scope.getUserId());
        if (!owner && !leaves.reviewAllowed(requestId)) {
            throw new AccessDeniedException("You cannot access this leave attachment");
        }
    }

    @Transactional(readOnly = true)
    public Attachment content(Long requestId, Long fileId) {
        requireRead(requestId);
        LeaveRequestFile file = files.findById(fileId).orElseThrow(LeaveAttachmentService::missing);
        if (!file.getLeaveRequest().getId().equals(requestId)) throw missing();
        Path path = resolve(file.getFilePath());
        String name = file.getFileName();
        if (name == null || name.isBlank()) name = "attachment";
        name = name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\r\\n\\x00-\\x1f]", "_");
        return new Attachment(path, name, previewType(path));
    }

    // Modern certificates are media-relative; older uploads used a separate root
    // and stored either an absolute path or a working-directory-relative path.
    Path resolve(String stored) {
        if (stored == null || stored.isBlank()) throw missing();
        try {
            Path supplied = Path.of(stored);
            for (Path configured : List.of(uploads.resolve(""), Path.of(legacyUploadDir))) {
                Path root = configured.toAbsolutePath().normalize();
                for (Path candidate : List.of(root.resolve(supplied).normalize(), supplied.toAbsolutePath().normalize())) {
                    if (!candidate.startsWith(root) || !Files.isRegularFile(candidate)) continue;
                    Path real = candidate.toRealPath();
                    if (real.startsWith(root.toRealPath())) return real;
                }
            }
        } catch (IOException | java.nio.file.InvalidPathException ignored) {
            // Never expose storage paths in an API error.
        }
        throw missing();
    }

    static String previewType(Path path) {
        try (var in = Files.newInputStream(path)) {
            byte[] b = in.readNBytes(12);
            if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "application/pdf";
            if (b.length >= 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216 && (b[2] & 255) == 255) return "image/jpeg";
            if (b.length >= 8 && (b[0] & 255) == 137 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                    && b[4] == 13 && b[5] == 10 && b[6] == 26 && b[7] == 10) return "image/png";
        } catch (IOException ignored) { throw missing(); }
        return "application/octet-stream";
    }

    private static ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file not found");
    }

    public record Attachment(Path path, String name, String contentType) {}
}
