package com.nexus.work.controller;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.request.UpdateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.dto.response.TaskStatisticsResponse;
import com.nexus.work.service.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskController {

    TaskService taskService;

    @GetMapping
    public List<TaskResponse> getTasks(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        if (name != null || status != null || priority != null) {
            return taskService.searchTasks(name, status, priority);
        }
        return taskService.getTasks();
    }

    @GetMapping("/statistics")
    public TaskStatisticsResponse getTaskStatistics() {
        return taskService.getTaskStatistics();
    }

    @GetMapping("/{id}")
    public TaskResponse getTaskById(@PathVariable String id) {
        return taskService.getTaskById(id);
    }

    @PostMapping
    public TaskResponse createTask(@RequestBody CreateTaskRequest request) {
        return taskService.createTask(request.getPlanId(), request);
    }

    @PutMapping("/{id}")
    public TaskResponse updateTask(@PathVariable String id, @RequestBody UpdateTaskRequest request) {
        return taskService.updateTask(id, request);
    }

    @DeleteMapping("/{id}")
    public String deleteTask(@PathVariable String id) {
        taskService.deleteTask(id);
        return "Task deleted successfully";
    }
}
