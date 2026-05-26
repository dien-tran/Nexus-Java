package com.nexus.work.service.impl;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.entity.Plan;
import com.nexus.work.entity.Task;
import com.nexus.work.mapper.TaskMapper;
import com.nexus.work.repository.PlanRepository;
import com.nexus.work.repository.TaskRepository;
import com.nexus.work.security.CurrentUserProvider;
import com.nexus.work.service.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskServiceImpl implements TaskService {

    PlanRepository planRepository;
    TaskRepository taskRepository;
    TaskMapper taskMapper;
    CurrentUserProvider currentUserProvider;

    @Override
    @CacheEvict(value = "tasks", key = "#root.target.currentUserId()")
    public TaskResponse createTask(String id, CreateTaskRequest request) {
        // Chi cho tao task trong plan thuoc user hien tai, tranh user nay ghi vao plan user khac.
        Plan plan = planRepository.findByIdAndOwnerUserId(id, currentUserId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        Task task = taskMapper.toTask(request);
        task.setPlan(plan);

        return taskMapper.toTaskResponse(taskRepository.save(task));
    }

    @Override
    @Cacheable(value = "tasks", key = "#root.target.currentUserId()")
    public List<TaskResponse> getTasks() {
        return taskMapper.toTaskResponse(taskRepository.findAllByPlanOwnerUserId(currentUserId()));
    }

    public String currentUserId() {
        return currentUserProvider.currentUserId();
    }
}
