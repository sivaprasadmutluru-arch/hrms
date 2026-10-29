package com.example.demo.leave.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveRequestFile;
import com.example.demo.leave.repository.LeaveRequestFileRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LeaveAttachmentServiceTest {
    @TempDir Path root;
    LeaveService leaves = mock(LeaveService.class);
    LeaveRequestFileRepository files = mock(LeaveRequestFileRepository.class);
    FileUploadService uploads = mock(FileUploadService.class);
    LeaveAttachmentService service = new LeaveAttachmentService(leaves, files, uploads);
    LeaveRequest request = new LeaveRequest();
    LeaveRequestFile attachment = new LeaveRequestFile();

    @BeforeEach void setup() throws Exception {
        Company company = new Company(); company.setId(10L);
        User user = new User(); user.setId(9L);
        Employee employee = new Employee(); employee.setUser(user);
        request.setId(1L); request.setCompany(company); request.setEmployee(employee);
        attachment.setId(2L); attachment.setLeaveRequest(request); attachment.setFileName("certificate.pdf");
        attachment.setFilePath("certificate.pdf");
        Files.writeString(root.resolve("certificate.pdf"), "%PDF-1.7\nfixture");
        when(uploads.resolve("")).thenReturn(root);
        ReflectionTestUtils.setField(service, "legacyUploadDir", root.resolve("legacy").toString());
        when(leaves.getRequestById(1L)).thenReturn(request);
        when(files.findById(2L)).thenReturn(Optional.of(attachment));
        scope(9L, 10L);
    }
    void scope(long userId, long companyId) {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(userId, companyId, UserRole.AccessScope.SELF, List.of(companyId)));
    }
    @AfterEach void cleanup() { AccessScopeContext.clear(); }
    @Test void ownerCanReadExistingCertificate() {
        var result = service.content(1L, 2L);
        assertEquals("application/pdf", result.contentType());
        assertEquals(root.resolve("certificate.pdf"), result.path());
    }
    @Test void authorizedReviewerCanReadButUnrelatedEmployeeCannot() {
        scope(8L, 10L);
        assertThrows(AccessDeniedException.class, () -> service.content(1L,2L));
        when(leaves.reviewAllowed(1L)).thenReturn(true);
        assertEquals("certificate.pdf", service.content(1L,2L).name());
    }
    @Test void wrongCompanyAndMissingContextFailClosed() {
        scope(9L, 99L);
        assertThrows(AccessDeniedException.class, () -> service.content(1L,2L));
        AccessScopeContext.clear();
        assertThrows(AccessDeniedException.class, () -> service.content(1L,2L));
        verifyNoInteractions(files);
    }
    @Test void selectedCompanyFilterAndWrongParentAreRejected() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.ENTERPRISE,List.of(10L,99L),null,99L));
        assertThrows(AccessDeniedException.class, () -> service.content(1L,2L));
        scope(9L,10L);
        LeaveRequest other = new LeaveRequest(); other.setId(3L); attachment.setLeaveRequest(other);
        assertThrows(ResponseStatusException.class, () -> service.content(1L,2L));
    }
    @Test void supportsAbsoluteAndSeparateLegacyUploadRoot() throws Exception {
        attachment.setFilePath(root.resolve("certificate.pdf").toString());
        assertEquals("application/pdf", service.content(1L,2L).contentType());
        Files.createDirectories(root.resolve("legacy"));
        Files.writeString(root.resolve("legacy/old.pdf"), "%PDF-1.4");
        attachment.setFilePath("old.pdf");
        assertEquals("application/pdf", service.content(1L,2L).contentType());
    }
    @Test void rejectsTraversalAndMissingFiles() {
        attachment.setFilePath("../outside.pdf");
        assertThrows(ResponseStatusException.class, () -> service.content(1L,2L));
        attachment.setFilePath("missing.pdf");
        assertThrows(ResponseStatusException.class, () -> service.content(1L,2L));
    }
    @Test void untrustedHtmlIsNeverInlineAndFilenameIsSanitized() throws Exception {
        Files.writeString(root.resolve("fake.pdf"), "<html>not a PDF</html>");
        attachment.setFilePath("fake.pdf"); attachment.setFileName("../../certificate\r\n.pdf");
        var result = service.content(1L,2L);
        assertEquals("application/octet-stream",result.contentType());
        assertEquals("certificate__.pdf",result.name());
    }
}
