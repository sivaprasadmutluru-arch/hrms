package com.example.demo.carr.dto;

import com.example.demo.carr.entity.CarrResponsibility.TaskStatus;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.List;

public final class CarrTaskDtos {
    private CarrTaskDtos() {}
    public record TaskRequest(@NotBlank @Size(max=180) String title, @Size(max=4000) String description,
            @NotNull @Positive Long employeeId, @Positive Long departmentId, @Pattern(regexp="LOW|MEDIUM|HIGH|URGENT") String priority,
            LocalDate dueDate, @NotNull TaskStatus status, @Min(0) @Max(100) int progress,
            @Size(max=8000) String instructions, @Size(max=4000) String requiredDeliverables,
            Boolean requiresReview, Boolean requiresEvidence,
            @Size(max=30) List<@NotBlank @Size(max=300) String> checklist) {
        public TaskRequest(String title,String description,Long employeeId,Long departmentId,String priority,LocalDate dueDate,
                           TaskStatus status,int progress,String instructions,String requiredDeliverables,Boolean requiresReview,Boolean requiresEvidence) {
            this(title,description,employeeId,departmentId,priority,dueDate,status,progress,instructions,requiredDeliverables,requiresReview,requiresEvidence,null);
        }
        public TaskRequest(String title, String description, Long employeeId, Long departmentId, String priority,
                           LocalDate dueDate, TaskStatus status, int progress) {
            this(title, description, employeeId, departmentId, priority, dueDate, status, progress, null, null, false, false);
        }
    }
    public record ProgressRequest(@NotNull TaskStatus status, @Min(0) @Max(100) int progress,
            @Size(max=1000) String comment, @Size(max=8000) String workDetails,
            @Size(max=4000) String blockerReason, LocalDate actualCompletionDate) {
        public ProgressRequest(TaskStatus status, int progress, String comment) {
            this(status, progress, comment, null, null, null);
        }
    }
    public record DetailsRequest(@NotBlank @Size(max=180) String title,
            @Size(max=4000) String description, LocalDate dueDate) {}
    public record CommentRequest(@NotBlank @Size(max=4000) String comment) {}
    public record ReviewRequest(@NotNull Boolean approved, @Size(max=4000) String comment) {}
    public record ChecklistRequest(@NotNull Boolean completed) {}
    public record ChecklistItem(String id,String label,boolean completed,Long completedByUserId,LocalDateTime completedAt) {}
    public record TaskResponse(Long id, Long carrId, String title, String description, Long companyId,
            String companyName, Long departmentId, String departmentName, Long employeeId, String employeeName,
            String priority, LocalDate dueDate, TaskStatus status, int progress, boolean overdue,
            boolean canEdit, boolean canUpdateProgress, LocalDateTime updatedAt,
            String instructions, String requiredDeliverables, boolean requiresReview, boolean requiresEvidence,
            Long assignedByUserId, String assignedByName, Long reviewerUserId, LocalDateTime assignedAt,
            String workDetails, String blockerReason, String reviewFeedback, LocalDate actualCompletionDate,
            LocalDateTime submittedAt, LocalDateTime completedAt, boolean canSubmit, boolean canReview,
            LocalDateTime createdAt,List<ChecklistItem> checklist,String reviewerName) {}
    public record AttachmentResponse(Long id, String filename, long fileSize, String kind, Long uploadedByUserId, LocalDateTime createdAt) {}
    public record TaskDetail(TaskResponse task, List<AttachmentResponse> attachments, List<CarrDtos.AuditResponse> activity) {}
    public record EmployeeOption(Long id, String name, Long departmentId) {}
    public record DepartmentOption(Long id, String name) {}
    public record TaskOptions(List<EmployeeOption> employees, List<DepartmentOption> departments, boolean canCreate, String companyName) {}
}
