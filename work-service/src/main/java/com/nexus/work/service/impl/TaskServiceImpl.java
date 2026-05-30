package com.nexus.work.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import com.nexus.work.constant.Priority;
import com.nexus.work.constant.TaskStatus;
import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.request.UpdateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.dto.response.TaskStatisticsResponse;
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
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Caching;
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
    @Caching(evict = {
            @CacheEvict(value = "tasks", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "tasks_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plan", key = "#root.target.currentUserId() + ':' + #id")
    })
    public TaskResponse createTask(String id, CreateTaskRequest request) {
        // Chi cho tao task trong plan thuoc user hien tai, tranh user nay ghi vao plan
        // user khac.
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

    @Override
    public List<TaskResponse> searchTasks(String name, String status, String priority) {
        return taskRepository.findAll((root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("plan").get("ownerUserId"), currentUserId()));
            if (name != null && !name.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), TaskStatus.valueOf(status)));
            }
            if (priority != null && !priority.isEmpty()) {
                predicates.add(cb.equal(root.get("priority"), Priority.valueOf(priority)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        }).stream().map(taskMapper::toTaskResponse).collect(Collectors.toList());
    }

    @Override
    @Cacheable(value = "tasks_stats", key = "#root.target.currentUserId()")
    public TaskStatisticsResponse getTaskStatistics() {
        List<Task> tasks = taskRepository.findAllByPlanOwnerUserId(currentUserId());
        return TaskStatisticsResponse.builder()
                .totalTasks(tasks.size())
                .statusCounts(
                        tasks.stream().collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting())))
                .priorityCounts(tasks.stream()
                        .collect(Collectors.groupingBy(t -> t.getPriority().name(), Collectors.counting())))
                .build();
    }

    @Override
    @Cacheable(value = "task", key = "#root.target.currentUserId() + ':' + #id")
    public TaskResponse getTaskById(String id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TASK_NOT_FOUND));

        if (!task.getPlan().getOwnerUserId().equals(currentUserId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return taskMapper.toTaskResponse(task);
    }

    public String currentUserId() {
        return currentUserProvider.currentUserId();
    }

    @Override
    @Transactional
    @Caching(put = @CachePut(value = "task", key = "#root.target.currentUserId() + ':' + #id"), evict = {
            @CacheEvict(value = "tasks", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "tasks_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plan", key = "#root.target.currentUserId() + ':' + #result.planId")
    })
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
    @Caching(evict = {
            @CacheEvict(value = "task", key = "#root.target.currentUserId() + ':' + #id"),
            @CacheEvict(value = "tasks", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "tasks_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plan", allEntries = true) // Xóa tất cả plan cache của user để đảm bảo an toàn sau khi
                                                           // delete task
    })
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
