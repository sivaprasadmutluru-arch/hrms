package com.example.demo.project.controller;

import com.example.demo.project.entity.Project;
import com.example.demo.project.entity.ProjectStage;
import com.example.demo.project.entity.Task;
import com.example.demo.project.entity.TimeSheet;
import com.example.demo.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects")
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<List<Project>> list() {
        return ResponseEntity.ok(projectService.listProjects());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<Project> get(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('project:create')")
    public ResponseEntity<Project> create(@RequestBody Project project) {
        return ResponseEntity.ok(projectService.createProject(project));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('project:edit')")
    public ResponseEntity<Project> update(@PathVariable Long id, @RequestBody Project updated) {
        return ResponseEntity.ok(projectService.updateProject(id, updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('project:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok(Map.of("message", "Project deactivated"));
    }

    // ─── Tasks ────────────────────────────────────────────────────────────────

    @GetMapping("/{projectId}/tasks")
    @PreAuthorize("hasAuthority('project:view')")
    public ResponseEntity<List<Task>> getTasks(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.listTasksByProject(projectId));
    }

    @PostMapping("/{projectId}/tasks")
    @PreAuthorize("hasAuthority('project:create')")
    public ResponseEntity<Task> createTask(@PathVariable Long projectId, @RequestBody Task task) {
        return ResponseEntity.ok(projectService.createTask(projectId, task));
    }

    @PutMapping("/tasks/{taskId}")
    @PreAuthorize("hasAuthority('project:edit')")
    public ResponseEntity<Task> updateTask(@PathVariable Long taskId, @RequestBody Task updated) {
        return ResponseEntity.ok(projectService.updateTask(taskId, updated));
    }

    // ─── Project Stages ───────────────────────────────────────────────────────

    @GetMapping("/{projectId}/stages")
    @PreAuthorize("hasAuthority('project:view')")
    @Operation(summary = "List stages for a project")
    public ResponseEntity<List<ProjectStage>> listStages(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.listStages(projectId));
    }

    @PostMapping("/{projectId}/stages")
    @PreAuthorize("hasAuthority('project:create')")
    @Operation(summary = "Create a stage for a project")
    public ResponseEntity<ProjectStage> createStage(@PathVariable Long projectId, @RequestBody ProjectStage stage) {
        return ResponseEntity.ok(projectService.createStage(projectId, stage));
    }

    @PutMapping("/stages/{stageId}")
    @PreAuthorize("hasAuthority('project:edit')")
    @Operation(summary = "Update a project stage")
    public ResponseEntity<ProjectStage> updateStage(@PathVariable Long stageId, @RequestBody ProjectStage updated) {
        return ResponseEntity.ok(projectService.updateStage(stageId, updated));
    }

    @DeleteMapping("/stages/{stageId}")
    @PreAuthorize("hasAuthority('project:delete')")
    @Operation(summary = "Delete a project stage")
    public ResponseEntity<Map<String, String>> deleteStage(@PathVariable Long stageId) {
        projectService.deleteStage(stageId);
        return ResponseEntity.ok(Map.of("message", "Stage deleted"));
    }

    // ─── Timesheets ───────────────────────────────────────────────────────────

    @GetMapping("/timesheets")
    @PreAuthorize("hasAuthority('project:view')")
    @Operation(summary = "List timesheets (company-scoped)")
    public ResponseEntity<List<TimeSheet>> listTimesheets() {
        return ResponseEntity.ok(projectService.listTimesheets());
    }

    @GetMapping("/timesheets/employee/{employeeId}")
    @PreAuthorize("hasAuthority('project:view')")
    @Operation(summary = "List timesheets for a specific employee")
    public ResponseEntity<List<TimeSheet>> listTimesheetsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(projectService.listTimesheetsByEmployee(employeeId));
    }

    @PostMapping("/timesheets")
    @PreAuthorize("hasAuthority('project:create')")
    @Operation(summary = "Create a timesheet entry")
    public ResponseEntity<TimeSheet> createTimesheet(@RequestBody TimeSheet timeSheet) {
        return ResponseEntity.ok(projectService.createTimesheet(timeSheet));
    }

    @PutMapping("/timesheets/{id}")
    @PreAuthorize("hasAuthority('project:edit')")
    @Operation(summary = "Update a timesheet entry")
    public ResponseEntity<TimeSheet> updateTimesheet(@PathVariable Long id, @RequestBody TimeSheet updated) {
        return ResponseEntity.ok(projectService.updateTimesheet(id, updated));
    }

    @DeleteMapping("/timesheets/{id}")
    @PreAuthorize("hasAuthority('project:delete')")
    @Operation(summary = "Delete a timesheet entry")
    public ResponseEntity<Map<String, String>> deleteTimesheet(@PathVariable Long id) {
        projectService.deleteTimesheet(id);
        return ResponseEntity.ok(Map.of("message", "Timesheet deleted"));
    }
}
