package com.example.demo.common.tenant;

import java.time.LocalDateTime;

/** Read-only operational status for a tenant workspace setup. */
public record TenantProvisioningStatusResponse(
        Long companyId,
        TenantProvisioningJob.Status status,
        int attempts,
        String lastError,
        LocalDateTime nextAttemptAt,
        LocalDateTime completedAt) {
}
