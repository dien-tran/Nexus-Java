package com.nexus.work.service.impl;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.request.UpdateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.entity.Plan;
import com.nexus.work.entity.Task;
import com.nexus.work.exception.AppException;
import com.nexus.work.exception.ErrorCode;
import com.nexus.work.mapper.TaskMapper;
import com.nexus.work.repository.PlanRepository;
import com.nexus.work.repository.TaskRepository;
import com.nexus.work.security.CurrentUserProvider;
import com.nexus.work.service.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskServiceImpl implements TaskService {

    PlanRepository planRepository;
    TaskRepository taskRepository;
    TaskMapper taskMapper;
    CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    @CacheEvict(value = "tasks", key = "#root.target.currentUserId()")
    public TaskResponse createTask(String id, CreateTaskRequest request) {
        // Chi cho tao task trong plan thuoc user hien tai, tranh user nay ghi vao plan user khac.
        Plan plan = planRepository.findByIdAndOwnerUserId(id, currentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.PLAN_NOT_FOUND));

        Task task = taskMapper.toTask(request);
        task.setPlan(plan);

        Task saved = taskRepository.save(task);
        log.info("User {} created task {} in plan {}", currentUserId(), saved.getId(), id);
        return taskMapper.toTaskResponse(saved);
    }

    @Override
    @Cacheable(value = "tasks", key = "#root.target.currentUserId()")
    public List<TaskResponse> getTasks() {
        return taskMapper.toTaskResponse(taskRepository.findAllByPlanOwnerUserId(currentUserId()));
    }

    public String currentUserId() {
        return currentUserProvider.currentUserId();
    }

    @Override
    @Transactional
    @CacheEvict(value = "tasks", key = "#root.target.currentUserId()")
    public TaskResponse updateTask(String id, UpdateTaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));

        if (!task.getPlan().getOwnerUserId().equals(currentUserId())) {
            log.warn("User {} tried to update task {} belonging to another user", currentUserId(), id);
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        taskMapper.UpdateTaskRequest(request, task);
        Task saved = taskRepository.save(task);
        log.info("User {} updated task {}", currentUserId(), id);
        return taskMapper.toTaskResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "tasks", key = "#root.target.currentUserId()")
    public void deleteTask(String id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));

        if (!task.getPlan().getOwnerUserId().equals(currentUserId())) {
            log.warn("User {} tried to delete task {} belonging to another user", currentUserId(), id);
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        taskRepository.delete(task);
        log.info("User {} deleted task {}", currentUserId(), id);
    }
}
