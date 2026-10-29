package com.example.demo.leave.controller;

import com.example.demo.leave.service.LeaveAttachmentService;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LeaveAttachmentControllerTest {
    @Test void previewIsPrivateInlineForPdfButUnknownFilesAreDownloadOnly() {
        var service = mock(LeaveAttachmentService.class);
        var controller = new LeaveAttachmentController(service);
        when(service.content(1L,2L)).thenReturn(new LeaveAttachmentService.Attachment(Path.of("certificate.pdf"),"certificate.pdf","application/pdf"));
        var response = controller.content(1L,2L,false);
        assertTrue(response.getHeaders().getContentDisposition().isInline());
        assertEquals("no-store",response.getHeaders().getCacheControl());
        assertEquals("nosniff",response.getHeaders().getFirst("X-Content-Type-Options"));
        assertTrue(controller.content(1L,2L,true).getHeaders().getContentDisposition().isAttachment());
        when(service.content(1L,2L)).thenReturn(new LeaveAttachmentService.Attachment(Path.of("file.html"),"file.html","application/octet-stream"));
        assertTrue(controller.content(1L,2L,false).getHeaders().getContentDisposition().isAttachment());
    }
}
