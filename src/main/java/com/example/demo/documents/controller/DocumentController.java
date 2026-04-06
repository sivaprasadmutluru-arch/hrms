package com.example.demo.documents.controller;

import com.example.demo.documents.entity.DocumentRequest;
import com.example.demo.documents.entity.EmployeeDocument;
import com.example.demo.documents.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Document Management")
public class DocumentController {

    private final DocumentService documentService;

    // ─── Document Requests ────────────────────────────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "List document requests (company-scoped)")
    public ResponseEntity<List<DocumentRequest>> listRequests() {
        return ResponseEntity.ok(documentService.listRequests());
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a document request")
    public ResponseEntity<DocumentRequest> createRequest(@RequestBody DocumentRequest request) {
        return ResponseEntity.ok(documentService.createRequest(request));
    }

    @PutMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a document request")
    public ResponseEntity<DocumentRequest> updateRequest(@PathVariable Long id, @RequestBody DocumentRequest updated) {
        return ResponseEntity.ok(documentService.updateRequest(id, updated));
    }

    @DeleteMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a document request")
    public ResponseEntity<Map<String, String>> deleteRequest(@PathVariable Long id) {
        documentService.deleteRequest(id);
        return ResponseEntity.ok(Map.of("message", "Document request deleted"));
    }

    // ─── Employee Documents ───────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('documents:view')")
    @Operation(summary = "List employee documents (company-scoped)")
    public ResponseEntity<List<EmployeeDocument>> listDocuments() {
        return ResponseEntity.ok(documentService.listDocuments());
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('documents:view')")
    @Operation(summary = "List documents for a specific employee")
    public ResponseEntity<List<EmployeeDocument>> listByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(documentService.listByEmployee(employeeId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('documents:create')")
    @Operation(summary = "Submit an employee document")
    public ResponseEntity<EmployeeDocument> createDocument(@RequestBody EmployeeDocument document) {
        return ResponseEntity.ok(documentService.createDocument(document));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Approve an employee document")
    public ResponseEntity<EmployeeDocument> approveDocument(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.approveDocument(id));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Reject an employee document")
    public ResponseEntity<EmployeeDocument> rejectDocument(@PathVariable Long id,
                                                            @RequestBody(required = false) Map<String, String> body) {
        String rejectReason = body != null ? body.get("rejectReason") : null;
        return ResponseEntity.ok(documentService.rejectDocument(id, rejectReason));
    }
}
