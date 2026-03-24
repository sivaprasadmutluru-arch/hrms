package com.example.demo.project.repository;

import com.example.demo.project.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByAssignedToId(Long employeeId);
    List<Task> findByProjectIdAndStage(Long projectId, Task.TaskStage stage);
}
