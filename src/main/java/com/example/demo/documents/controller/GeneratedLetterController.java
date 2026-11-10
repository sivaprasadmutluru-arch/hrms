package com.example.demo.documents.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.documents.entity.GeneratedLetter;
import com.example.demo.documents.service.LetterService;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents/letters")
@RequiredArgsConstructor
@Tag(name = "HR Letters & Certificates")
public class GeneratedLetterController {

    private final LetterService letterService;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "List all generated letters and certificates (company-scoped)")
    public ResponseEntity<List<GeneratedLetter>> list(
            @RequestParam(required = false) GeneratedLetter.LetterType type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(letterService.listLetters(type, search));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get letters and certificates issued to current logged in employee")
    public ResponseEntity<List<GeneratedLetter>> getMyLetters(@AuthenticationPrincipal UserPrincipal user) {
        if (user == null || user.getId() == null) {
            return ResponseEntity.ok(List.of());
        }
        return employeeRepository.findByUserId(user.getId())
                .map(emp -> ResponseEntity.ok(letterService.listForEmployee(emp.getId())))
                .orElse(ResponseEntity.ok(List.of()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Get single letter details by ID")
    public ResponseEntity<GeneratedLetter> getById(@PathVariable Long id) {
        return ResponseEntity.ok(letterService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create an offer letter, experience certificate, or relieving letter")
    public ResponseEntity<GeneratedLetter> create(@RequestBody GeneratedLetter letter) {
        return ResponseEntity.ok(letterService.createLetter(letter));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update letter details")
    public ResponseEntity<GeneratedLetter> update(@PathVariable Long id, @RequestBody GeneratedLetter updated) {
        return ResponseEntity.ok(letterService.updateLetter(id, updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a letter record")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        letterService.deleteLetter(id);
        return ResponseEntity.ok(Map.of("message", "Letter deleted successfully"));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Generate and stream PDF for printing or downloading")
    public ResponseEntity<byte[]> getPdf(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean download) {
        GeneratedLetter letter = letterService.getById(id);
        byte[] pdf = letterService.generatePdf(id);

        String safeRef = letter.getReferenceNumber().replaceAll("[^a-zA-Z0-9.-]", "_");
        String filename = String.format("%s_%s.pdf", letter.getLetterType().name(), safeRef);
        String disposition = download ? "attachment" : "inline";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(disposition, filename);
        headers.set("X-Frame-Options", "SAMEORIGIN");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping("/{id}/send-email")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Send generated document as PDF attachment through email")
    public ResponseEntity<Map<String, Object>> sendEmail(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String customTo = body != null ? body.get("to") : null;
        String customSubject = body != null ? body.get("subject") : null;
        String customMessage = body != null ? body.get("message") : null;

        boolean sent = letterService.sendEmail(id, customTo, customSubject, customMessage);
        if (sent) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email sent successfully with PDF attachment."
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Document was generated, but email could not be delivered (SMTP is not configured or failed to send)."
            ));
        }
    }
}
