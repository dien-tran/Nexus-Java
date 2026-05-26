package com.nexus.work.controller;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.service.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskController {

    TaskService taskService;

    @GetMapping
    public List<TaskResponse> getTasks() {
        return taskService.getTasks();
    }

    @PostMapping("/create/{id}")
    public TaskResponse createTask(@PathVariable String id, @RequestBody CreateTaskRequest request) {
        return taskService.createTask(id, request);
    }

    @PutMapping("/update")
    public String updateTask() {
        return "Task updated";
    }

    @DeleteMapping("/delete")
    public String deleteTask() {
        return "Task deleted";
    }
}
