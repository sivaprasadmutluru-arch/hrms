package com.example.demo.documents.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.documents.entity.DocumentRequest;
import com.example.demo.documents.entity.EmployeeDocument;
import com.example.demo.documents.repository.DocumentRequestRepository;
import com.example.demo.documents.repository.EmployeeDocumentRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.documents.dto.SubmissionStatusDTO;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {

    private final DocumentRequestRepository documentRequestRepository;
    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;

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
        // Convert JSON employee stubs to managed JPA references so the join table is persisted
        if (request.getEmployees() != null && !request.getEmployees().isEmpty()) {
            request.setEmployees(request.getEmployees().stream()
                    .filter(e -> e.getId() != null)
                    .map(e -> employeeRepository.getReferenceById(e.getId()))
                    .collect(Collectors.toList()));
        }
        DocumentRequest saved = documentRequestRepository.save(request);

        // Notify each tagged employee — reload from DB to get the managed User reference
        if (saved.getEmployees() != null) {
            for (Employee emp : saved.getEmployees()) {
                Employee fullEmp = employeeRepository.findById(emp.getId()).orElse(null);
                if (fullEmp != null && fullEmp.getUser() != null) {
                    emp = fullEmp;
                }
                if (emp.getUser() != null) {
                    try {
                        notificationService.send(
                                emp.getUser().getId(),
                                "Document Requested",
                                "You have a new document request: " + saved.getTitle(),
                                Notification.NotificationType.GENERAL,
                                "DocumentRequest",
                                saved.getId(),
                                saved.getCompany()
                        );
                    } catch (Exception e) {
                        log.warn("Failed to send notification for document request {} to user {}: {}",
                                saved.getId(), emp.getUser().getId(), e.getMessage());
                    }
                }
            }
        }
        return saved;
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

    @Transactional(readOnly = true)
    public List<DocumentRequest> getRequestsForEmployee(Long employeeId) {
        return documentRequestRepository.findByEmployeeId(employeeId);
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
        if (document.getStatus() == null) {
            document.setStatus(EmployeeDocument.DocumentStatus.SUBMITTED);
        }
        return employeeDocumentRepository.save(document);
    }

    public EmployeeDocument approveDocument(Long id) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.APPROVED);
        return employeeDocumentRepository.save(doc);
    }

    @Transactional(readOnly = true)
    public List<SubmissionStatusDTO> getSubmissionStatus(Long requestId) {
        DocumentRequest request = documentRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentRequest", requestId));

        // Build a map of employeeId → their submission for this request
        Map<Long, EmployeeDocument> submissionByEmployee = employeeDocumentRepository
                .findByDocumentRequestId(requestId)
                .stream()
                .collect(Collectors.toMap(d -> d.getEmployee().getId(), d -> d));

        return request.getEmployees().stream()
                .map(emp -> {
                    EmployeeDocument doc = submissionByEmployee.get(emp.getId());
                    if (doc != null) {
                        return new SubmissionStatusDTO(
                                emp.getId(),
                                emp.getBadgeId(),
                                emp.getFirstName() + " " + emp.getLastName(),
                                emp.getEmail(),
                                doc.getStatus(),
                                doc.getCreatedAt(),
                                doc.getRejectReason()
                        );
                    } else {
                        return new SubmissionStatusDTO(
                                emp.getId(),
                                emp.getBadgeId(),
                                emp.getFirstName() + " " + emp.getLastName(),
                                emp.getEmail(),
                                null,   // PENDING — no submission yet
                                null,
                                null
                        );
                    }
                })
                .collect(Collectors.toList());
    }

    public EmployeeDocument rejectDocument(Long id, String rejectReason) {
        EmployeeDocument doc = employeeDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeDocument", id));
        doc.setStatus(EmployeeDocument.DocumentStatus.REJECTED);
        if (rejectReason != null) doc.setRejectReason(rejectReason);
        return employeeDocumentRepository.save(doc);
    }
}
