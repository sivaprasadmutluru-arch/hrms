package com.example.demo.project.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.project.entity.Project;
import com.example.demo.project.entity.ProjectStage;
import com.example.demo.project.entity.Task;
import com.example.demo.project.entity.TimeSheet;
import com.example.demo.project.repository.ProjectRepository;
import com.example.demo.project.repository.ProjectStageRepository;
import com.example.demo.project.repository.TaskRepository;
import com.example.demo.project.repository.TimeSheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ProjectStageRepository stageRepository;
    private final TimeSheetRepository timeSheetRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Projects ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Project> listProjects() {
        Specification<Project> spec = ScopeFilter.byCompany();
        return spec != null ? projectRepository.findAll(spec) : projectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Project getProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
    }

    @Transactional
    public Project createProject(Project project) {
        if (project.getCompany() != null && project.getCompany().getId() != null) {
            project.setCompany(companyRepository.getReferenceById(project.getCompany().getId()));
        }
        if (project.getManager() != null && project.getManager().getId() != null) {
            project.setManager(employeeRepository.getReferenceById(project.getManager().getId()));
        }
        log.info("Creating project: {}", project.getTitle());
        return projectRepository.save(project);
    }

    @Transactional
    public Project updateProject(Long id, Project updated) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setTitle(updated.getTitle());
        project.setDescription(updated.getDescription());
        project.setStartDate(updated.getStartDate());
        project.setEndDate(updated.getEndDate());
        project.setStatus(updated.getStatus());
        if (updated.getManager() != null && updated.getManager().getId() != null) {
            project.setManager(employeeRepository.getReferenceById(updated.getManager().getId()));
        }
        log.info("Updating project id={}", id);
        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setActive(false);
        projectRepository.save(project);
        log.info("Soft-deleted project id={}", id);
    }

    @Transactional
    public Project assignEmployeeToProject(Long projectId, Long employeeId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        if (!project.getMembers().contains(employee)) {
            project.getMembers().add(employee);
            project = projectRepository.save(project);
            log.info("Assigned employee id={} to project id={}", employeeId, projectId);
        }
        return project;
    }

    @Transactional
    public Project completeProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        project.setStatus(Project.ProjectStatus.COMPLETED);
        log.info("Marking project id={} as COMPLETED", projectId);
        return projectRepository.save(project);
    }

    // ─── Tasks ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Task> listTasksByProject(Long projectId) {
        return taskRepository.findByProjectId(projectId);
    }

    @Transactional(readOnly = true)
    public Task getTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
    }

    @Transactional
    public Task createTask(Long projectId, Task task) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        task.setProject(project);
        if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
            task.setAssignedTo(employeeRepository.getReferenceById(task.getAssignedTo().getId()));
        }
        log.info("Creating task '{}' in project id={}", task.getTitle(), projectId);
        return taskRepository.save(task);
    }

    @Transactional
    public Task updateTask(Long taskId, Task updated) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        task.setStage(updated.getStage());
        task.setPriority(updated.getPriority());
        task.setDeadline(updated.getDeadline());
        if (updated.getAssignedTo() != null && updated.getAssignedTo().getId() != null) {
            task.setAssignedTo(employeeRepository.getReferenceById(updated.getAssignedTo().getId()));
        }
        return taskRepository.save(task);
    }

    @Transactional
    public void deleteTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        task.setActive(false);
        taskRepository.save(task);
        log.info("Soft-deleted task id={}", taskId);
    }

    @Transactional
    public Task assignTaskToEmployee(Long taskId, Long employeeId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        task.setAssignedTo(employee);
        log.info("Assigned task id={} to employee id={}", taskId, employeeId);
        return taskRepository.save(task);
    }

    @Transactional
    public Task updateTaskStatus(Long taskId, Task.TaskStage stage) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        task.setStage(stage);
        log.info("Updated task id={} stage to {}", taskId, stage);
        return taskRepository.save(task);
    }

    // ─── Project Stages ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProjectStage> listStages(Long projectId) {
        return stageRepository.findByProjectIdOrderBySequenceAsc(projectId);
    }

    @Transactional
    public ProjectStage createStage(Long projectId, ProjectStage stage) {
        stage.setProject(projectRepository.getReferenceById(projectId));
        if (stage.getCompany() != null && stage.getCompany().getId() != null) {
            stage.setCompany(companyRepository.getReferenceById(stage.getCompany().getId()));
        }
        return stageRepository.save(stage);
    }

    @Transactional
    public ProjectStage updateStage(Long stageId, ProjectStage updated) {
        ProjectStage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectStage", stageId));
        stage.setName(updated.getName());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    @Transactional
    public void deleteStage(Long stageId) {
        stageRepository.deleteById(stageId);
        log.info("Deleted project stage id={}", stageId);
    }

    // ─── Timesheets ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TimeSheet> listTimesheets() {
        Specification<TimeSheet> spec = ScopeFilter.byEmployee();
        return spec != null ? timeSheetRepository.findAll(spec) : timeSheetRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<TimeSheet> listTimesheetsByEmployee(Long employeeId) {
        return timeSheetRepository.findByEmployeeId(employeeId);
    }

    @Transactional
    public TimeSheet createTimesheet(TimeSheet timeSheet) {
        if (timeSheet.getEmployee() != null && timeSheet.getEmployee().getId() != null) {
            timeSheet.setEmployee(employeeRepository.getReferenceById(timeSheet.getEmployee().getId()));
        }
        if (timeSheet.getTask() != null && timeSheet.getTask().getId() != null) {
            timeSheet.setTask(taskRepository.getReferenceById(timeSheet.getTask().getId()));
        }
        if (timeSheet.getCompany() != null && timeSheet.getCompany().getId() != null) {
            timeSheet.setCompany(companyRepository.getReferenceById(timeSheet.getCompany().getId()));
        }
        return timeSheetRepository.save(timeSheet);
    }

    @Transactional
    public TimeSheet updateTimesheet(Long id, TimeSheet updated) {
        TimeSheet ts = timeSheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSheet", id));
        ts.setDate(updated.getDate());
        ts.setHours(updated.getHours());
        ts.setDescription(updated.getDescription());
        return timeSheetRepository.save(ts);
    }

    @Transactional
    public void deleteTimesheet(Long id) {
        timeSheetRepository.deleteById(id);
        log.info("Deleted timesheet id={}", id);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getProjectDashboard() {
        Specification<Project> projectSpec = ScopeFilter.byCompany();
        List<Project> projects = projectSpec != null
                ? projectRepository.findAll(projectSpec)
                : projectRepository.findAll();

        long total = projects.size();
        long active = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.IN_PROGRESS)
                .count();
        long completed = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.COMPLETED)
                .count();

        List<Long> projectIds = projects.stream().map(Project::getId).toList();

        long overdueTasks = 0;
        if (!projectIds.isEmpty()) {
            List<Task> allTasks = taskRepository.findAll();
            LocalDate today = LocalDate.now();
            overdueTasks = allTasks.stream()
                    .filter(t -> projectIds.contains(t.getProject().getId()))
                    .filter(t -> t.getStage() != Task.TaskStage.DONE)
                    .filter(t -> t.getDeadline() != null && t.getDeadline().isBefore(today))
                    .count();
        }

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("totalProjects", total);
        dashboard.put("activeProjects", active);
        dashboard.put("completedProjects", completed);
        dashboard.put("overdueTasks", overdueTasks);
        return dashboard;
    }
}
