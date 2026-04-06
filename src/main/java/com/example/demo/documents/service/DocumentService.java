package com.example.demo.documents.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.documents.entity.DocumentRequest;
import com.example.demo.documents.entity.EmployeeDocument;
import com.example.demo.documents.repository.DocumentRequestRepository;
import com.example.demo.documents.repository.EmployeeDocumentRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {

    private final DocumentRequestRepository documentRequestRepository;
    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Document Requests ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocumentRequest> listRequests() {
        var spec = ScopeFilter.<DocumentRequest>byCompany();
        return spec != null ? documentRequestRepository.findAll(spec) : documentRequestRepository.findAll();
    }

    public DocumentRequest createRequest(DocumentRequest request) {
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        return documentRequestRepository.save(request);
    }

    public DocumentRequest updateRequest(Long id, DocumentRequest updated) {
        DocumentRequest req = documentRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentRequest", id));
        req.setTitle(updated.getTitle());
        req.setDocumentFormat(updated.getDocumentFormat());
        req.setMaxSizeMb(updated.getMaxSizeMb());
        req.setDescription(updated.getDescription());
        return documentRequestRepository.save(req);
    }

    public void deleteRequest(Long id) {
        documentRequestRepository.deleteById(id);
    }

    // ─── Employee Documents ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeDocument> listDocuments() {
        var spec = ScopeFilter.<EmployeeDocument>byEmployee();
        return spec != null ? employeeDocumentRepository.findAll(spec) : employeeDocumentRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<EmployeeDocument> listByEmployee(Long employeeId) {
        return employeeDocumentRepository.findByEmployeeId(employeeId);
    }

    public EmployeeDocument createDocument(EmployeeDocument document) {
        if (document.getEmployee() != null && document.getEmployee().getId() != null) {
            document.setEmployee(employeeRepository.getReferenceById(document.getEmployee().getId()));
        }
        if (document.getCompany() != null && document.getCompany().getId() != null) {
            document.setCompany(companyRepository.getReferenceById(document.getCompany().getId()));
        }
        return employeeDocumentRepository.save(document);
    }

    public EmployeeDocument approveDocument(Long id) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.APPROVED);
        return employeeDocumentRepository.save(doc);
    }

    public EmployeeDocument rejectDocument(Long id, String rejectReason) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.REJECTED);
        if (rejectReason != null) doc.setRejectReason(rejectReason);
        return employeeDocumentRepository.save(doc);
    }
}
