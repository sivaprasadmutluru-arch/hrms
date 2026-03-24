package com.example.demo.project.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.project.entity.Project;
import com.example.demo.project.entity.ProjectStage;
import com.example.demo.project.entity.Task;
import com.example.demo.project.entity.TimeSheet;
import com.example.demo.project.repository.ProjectRepository;
import com.example.demo.project.repository.ProjectStageRepository;
import com.example.demo.project.repository.TaskRepository;
import com.example.demo.project.repository.TimeSheetRepository;
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
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ProjectStageRepository stageRepository;
    private final TimeSheetRepository timeSheetRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<List<Project>> list() {
        var spec = ScopeFilter.<Project>byCompany();
        return ResponseEntity.ok(spec != null ? projectRepository.findAll(spec) : projectRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<Project> get(@PathVariable Long id) {
        return ResponseEntity.ok(projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('project:create')")
    public ResponseEntity<Project> create(@RequestBody Project project) {
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('project:edit')")
    public ResponseEntity<Project> update(@PathVariable Long id, @RequestBody Project updated) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setTitle(updated.getTitle());
        project.setDescription(updated.getDescription());
        project.setStartDate(updated.getStartDate());
        project.setEndDate(updated.getEndDate());
        project.setStatus(updated.getStatus());
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('project:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setActive(false);
        projectRepository.save(project);
        return ResponseEntity.ok(Map.of("message", "Project deactivated"));
    }

    @GetMapping("/{projectId}/tasks")
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<List<Task>> getTasks(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskRepository.findByProjectId(projectId));
    }

    @PostMapping("/{projectId}/tasks")
    @PreAuthorize("hasAuthority('project:create')")
    public ResponseEntity<Task> createTask(@PathVariable Long projectId, @RequestBody Task task) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        task.setProject(project);
        return ResponseEntity.ok(taskRepository.save(task));
    }

    @PutMapping("/tasks/{taskId}")
    @PreAuthorize("hasAuthority('project:edit')")
    public ResponseEntity<Task> updateTask(@PathVariable Long taskId, @RequestBody Task updated) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        task.setStage(updated.getStage());
        task.setPriority(updated.getPriority());
        task.setDeadline(updated.getDeadline());
        task.setAssignedTo(updated.getAssignedTo());
        return ResponseEntity.ok(taskRepository.save(task));
    }

    // ─── Project Stages ───────────────────────────────────────────────────────

    @GetMapping("/{projectId}/stages")
    @PreAuthorize("hasAuthority('project:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List stages for a project")
    public ResponseEntity<List<ProjectStage>> listStages(@PathVariable Long projectId) {
        return ResponseEntity.ok(stageRepository.findByProjectIdOrderBySequenceAsc(projectId));
    }

    @PostMapping("/{projectId}/stages")
    @PreAuthorize("hasAuthority('project:create')")
    @Transactional
    @Operation(summary = "Create a stage for a project")
    public ResponseEntity<ProjectStage> createStage(@PathVariable Long projectId, @RequestBody ProjectStage stage) {
        stage.setProject(projectRepository.getReferenceById(projectId));
        if (stage.getCompany() != null && stage.getCompany().getId() != null) {
            stage.setCompany(companyRepository.getReferenceById(stage.getCompany().getId()));
        }
        return ResponseEntity.ok(stageRepository.save(stage));
    }

    @PutMapping("/stages/{stageId}")
    @PreAuthorize("hasAuthority('project:edit')")
    @Transactional
    @Operation(summary = "Update a project stage")
    public ResponseEntity<ProjectStage> updateStage(@PathVariable Long stageId, @RequestBody ProjectStage updated) {
        ProjectStage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectStage", stageId));
        stage.setName(updated.getName());
        stage.setSequence(updated.getSequence());
        return ResponseEntity.ok(stageRepository.save(stage));
    }

    @DeleteMapping("/stages/{stageId}")
    @PreAuthorize("hasAuthority('project:delete')")
    @Operation(summary = "Delete a project stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long stageId) {
        stageRepository.deleteById(stageId);
        return ResponseEntity.ok(Map.of("message", "Stage deleted"));
    }

    // ─── Timesheets ───────────────────────────────────────────────────────────

    @GetMapping("/timesheets")
    @PreAuthorize("hasAuthority('project:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List timesheets (company-scoped)")
    public ResponseEntity<List<TimeSheet>> listTimesheets() {
        var spec = ScopeFilter.<TimeSheet>byEmployee();
        return ResponseEntity.ok(spec != null ? timeSheetRepository.findAll(spec) : timeSheetRepository.findAll());
    }

    @GetMapping("/timesheets/employee/{employeeId}")
    @PreAuthorize("hasAuthority('project:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List timesheets for a specific employee")
    public ResponseEntity<List<TimeSheet>> listTimesheetsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(timeSheetRepository.findByEmployeeId(employeeId));
    }

    @PostMapping("/timesheets")
    @PreAuthorize("hasAuthority('project:create')")
    @Transactional
    @Operation(summary = "Create a timesheet entry")
    public ResponseEntity<TimeSheet> createTimesheet(@RequestBody TimeSheet timeSheet) {
        if (timeSheet.getEmployee() != null && timeSheet.getEmployee().getId() != null) {
            timeSheet.setEmployee(employeeRepository.getReferenceById(timeSheet.getEmployee().getId()));
        }
        if (timeSheet.getTask() != null && timeSheet.getTask().getId() != null) {
            timeSheet.setTask(taskRepository.getReferenceById(timeSheet.getTask().getId()));
        }
        if (timeSheet.getCompany() != null && timeSheet.getCompany().getId() != null) {
            timeSheet.setCompany(companyRepository.getReferenceById(timeSheet.getCompany().getId()));
        }
        return ResponseEntity.ok(timeSheetRepository.save(timeSheet));
    }

    @PutMapping("/timesheets/{id}")
    @PreAuthorize("hasAuthority('project:edit')")
    @Transactional
    @Operation(summary = "Update a timesheet entry")
    public ResponseEntity<TimeSheet> updateTimesheet(@PathVariable Long id, @RequestBody TimeSheet updated) {
        TimeSheet ts = timeSheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSheet", id));
        ts.setDate(updated.getDate());
        ts.setHours(updated.getHours());
        ts.setDescription(updated.getDescription());
        return ResponseEntity.ok(timeSheetRepository.save(ts));
    }

    @DeleteMapping("/timesheets/{id}")
    @PreAuthorize("hasAuthority('project:delete')")
    @Operation(summary = "Delete a timesheet entry")
    public ResponseEntity<Map<String, String>> deleteTimesheet(@PathVariable Long id) {
        timeSheetRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Timesheet deleted"));
    }
}
