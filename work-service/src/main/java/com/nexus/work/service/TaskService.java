package com.nexus.work.service;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.request.UpdateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;

public interface TaskService {
    TaskResponse createTask(String id, CreateTaskRequest request);

    List<TaskResponse> getTasks();

    TaskResponse updateTask(String id, UpdateTaskRequest request);

    void deleteTask(String id);
}
