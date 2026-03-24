package com.example.demo.audit;

import com.example.demo.audit.entity.AuditLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(String entityType, Object id, String action, Object before, Object after) {
        try {
            AuditLog entry = new AuditLog();
            entry.setEntityType(entityType);
            entry.setEntityId(id != null ? id.toString() : null);
            entry.setAction(action);
            entry.setOldValues(before != null ? objectMapper.writeValueAsString(before) : null);
            entry.setNewValues(after != null ? objectMapper.writeValueAsString(after) : null);

            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) entry.setChangedBy(auth.getName());

            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log: {}", e.getMessage());
        }
    }
}
