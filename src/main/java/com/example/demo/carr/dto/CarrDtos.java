package com.example.demo.carr.dto;

import com.example.demo.carr.entity.CarrKpi;
import com.example.demo.carr.entity.CarrStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class CarrDtos {
    private CarrDtos() {}
    public record TemplateRequest(Long jobRoleId, @NotBlank @Size(max=180) String title,
                                  String purpose, String scope, String competencies) {}
    public record TemplateResponse(Long id, Long jobRoleId, String jobRoleName, String title,
                                   String purpose, String scope, String competencies, int version, boolean active) {}
    public record ResponsibilityRequest(Long id, @NotBlank @Size(max=500) String statement,
                                        Long accountableEmployeeId, String priority, String frequency,
                                        String evidenceRequired, @Min(0) @Max(100) int weight) {}
    public record KpiRequest(Long id, @NotBlank @Size(max=220) String name, CarrKpi.Type type,
                             CarrKpi.Direction direction, @NotNull @DecimalMin("0.0001") @Digits(integer=15,fraction=4) BigDecimal targetValue,
                             @DecimalMin("0") @Digits(integer=15,fraction=4) BigDecimal actualValue, @NotBlank @Size(max=40) String unit, @Min(1) @Max(100) int weight,
                             LocalDate dueDate, @Size(max=300) String dataSource, @Size(max=1000) String evidence,
                             @Pattern(regexp="Monthly|Quarterly|Annually|Yearly|Half-Yearly") String reviewFrequency,
                             @Size(max=1000) String metricDefinition, @Size(max=100) String generationKey, Boolean manuallyEdited) {}
    public record RecordRequest(@NotNull Long employeeId, Long departmentId, Long templateId, Long cycleId, Long managerId,
                                @NotBlank @Size(max=180) String title, String purpose,
                                String industry, String roleLevel, String reportsToTitle, String responsibleFor,
                                Boolean rewardsEnabled, Boolean rewardsVisibleToEmployee,
                                LocalDate effectiveFrom, LocalDate effectiveTo, LocalDate nextReviewDate,
                                @Valid List<ResponsibilityRequest> responsibilities,
                                @Valid List<KpiRequest> kpis, @Valid List<RewardRequest> rewards) {}
    public record RewardRequest(Long id, @NotBlank @Size(max=220) String name,
                                @Size(max=80) String status, @Size(max=80) String discussionWith) {}
    public record RewardResponse(Long id, String name, String status, String discussionWith) {}
    public record ResponsibilityResponse(Long id, String statement, Long accountableEmployeeId,
                                         String accountableEmployeeName, String priority, String frequency,
                                         String evidenceRequired, int weight) {}
    public record KpiResponse(Long id, String name, CarrKpi.Type type, CarrKpi.Direction direction,
                              BigDecimal targetValue, BigDecimal actualValue, String unit, int weight,
                              LocalDate dueDate, String dataSource, String evidence, BigDecimal achievementPercent,
                              String riskStatus, String reviewFrequency, String metricDefinition,
                              String generationKey, boolean manuallyEdited, BigDecimal weightedScore) {}
    public record KpiSuggestionRequest(@NotNull Long employeeId, Long departmentId, Long templateId,
                                      @NotBlank @Size(max=180) String designation,
                                      @Size(max=4000) String responsibilities, LocalDate effectiveFrom, LocalDate effectiveTo,
                                      @Pattern(regexp="Monthly|Quarterly|Annually") String reviewFrequency) {}
    public record KpiConfigurationRequest(@NotEmpty @Size(max=50) @Valid List<KpiRequest> kpis,
                                          @NotNull LocalDate effectiveFrom, @NotNull LocalDate effectiveTo, LocalDate nextReviewDate) {}
    public record RecordResponse(Long id, Long employeeId, String employeeIdCode, String employeeName,
                                 String department, Long templateId, String templateTitle, Long cycleId,
                                 String cycleName, Long managerId, String managerName, String title, String purpose,
                                 String industry, String roleLevel, String reportsToTitle, String responsibleFor,
                                 boolean rewardsEnabled, boolean rewardsVisibleToEmployee,
                                 CarrStatus status, int version, LocalDate effectiveFrom, LocalDate effectiveTo,
                                 LocalDate nextReviewDate, LocalDateTime publishedAt, LocalDateTime employeeAcknowledgedAt,
                                 LocalDateTime reviewCompletedAt, String employeeReflection, String managerComments,
                                 List<ResponsibilityResponse> responsibilities, List<KpiResponse> kpis,
                                 List<RewardResponse> rewards, BigDecimal resultScore, String returnReason) {}
    public record TransitionRequest(@NotNull CarrStatus status, @Size(max=1000) String comment) {}
    public record ChangeRequest(@NotBlank @Size(max=1000) String comment) {}
    public record ActualValueRequest(@NotNull @DecimalMin("0") @Digits(integer=15,fraction=4) BigDecimal actualValue, @NotBlank @Size(max=1000) String evidence) {}
    public record ReviewRequest(@Size(max=4000) String employeeReflection,
                                @Size(max=4000) String managerComments, LocalDate nextReviewDate) {}
    public record AuditResponse(Long id, String action, Long actorUserId, String actorEmail,
                                String details, LocalDateTime createdAt) {}
    public record DashboardResponse(long totalActiveEmployees, long employeesWithPublishedCarr,
                                    long withoutPublishedCarr, long drafts, long pendingApproval,
                                    long published, long reviewsOverdue, long kpisAtRisk,
                                    BigDecimal coveragePercent) {}
}
