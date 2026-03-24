package com.example.demo.documents.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.documents.entity.DocumentRequest;
import com.example.demo.documents.entity.EmployeeDocument;
import com.example.demo.documents.repository.DocumentRequestRepository;
import com.example.demo.documents.repository.EmployeeDocumentRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Document Management")
public class DocumentController {

    private final DocumentRequestRepository documentRequestRepository;
    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Document Requests ────────────────────────────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List document requests (company-scoped)")
    public ResponseEntity<List<DocumentRequest>> listRequests() {
        var spec = ScopeFilter.<DocumentRequest>byCompany();
        return ResponseEntity.ok(spec != null ? documentRequestRepository.findAll(spec) : documentRequestRepository.findAll());
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a document request")
    public ResponseEntity<DocumentRequest> createRequest(@RequestBody DocumentRequest request) {
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        return ResponseEntity.ok(documentRequestRepository.save(request));
    }

    @PutMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a document request")
    public ResponseEntity<DocumentRequest> updateRequest(@PathVariable Long id, @RequestBody DocumentRequest updated) {
        DocumentRequest req = documentRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentRequest", id));
        req.setTitle(updated.getTitle());
        req.setDocumentFormat(updated.getDocumentFormat());
        req.setMaxSizeMb(updated.getMaxSizeMb());
        req.setDescription(updated.getDescription());
        return ResponseEntity.ok(documentRequestRepository.save(req));
    }

    @DeleteMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a document request")
    public ResponseEntity<Map<String, String>> deleteRequest(@PathVariable Long id) {
        documentRequestRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Document request deleted"));
    }

    // ─── Employee Documents ───────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('documents:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List employee documents (company-scoped)")
    public ResponseEntity<List<EmployeeDocument>> listDocuments() {
        var spec = ScopeFilter.<EmployeeDocument>byEmployee();
        return ResponseEntity.ok(spec != null ? employeeDocumentRepository.findAll(spec) : employeeDocumentRepository.findAll());
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('documents:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List documents for a specific employee")
    public ResponseEntity<List<EmployeeDocument>> listByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(employeeDocumentRepository.findByEmployeeId(employeeId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('documents:create')")
    @Transactional
    @Operation(summary = "Submit an employee document")
    public ResponseEntity<EmployeeDocument> createDocument(@RequestBody EmployeeDocument document) {
        if (document.getEmployee() != null && document.getEmployee().getId() != null) {
            document.setEmployee(employeeRepository.getReferenceById(document.getEmployee().getId()));
        }
        if (document.getCompany() != null && document.getCompany().getId() != null) {
            document.setCompany(companyRepository.getReferenceById(document.getCompany().getId()));
        }
        return ResponseEntity.ok(employeeDocumentRepository.save(document));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Approve an employee document")
    public ResponseEntity<EmployeeDocument> approveDocument(@PathVariable Long id) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.APPROVED);
        return ResponseEntity.ok(employeeDocumentRepository.save(doc));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Reject an employee document")
    public ResponseEntity<EmployeeDocument> rejectDocument(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.REJECTED);
        if (body != null) doc.setRejectReason(body.get("rejectReason"));
        return ResponseEntity.ok(employeeDocumentRepository.save(doc));
    }
}
