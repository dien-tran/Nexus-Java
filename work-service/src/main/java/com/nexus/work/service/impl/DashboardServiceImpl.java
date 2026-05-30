package com.nexus.work.service.impl;

import com.nexus.work.constant.TaskStatus;
import com.nexus.work.dto.response.DashboardSummaryResponse;
import com.nexus.work.entity.Plan;
import com.nexus.work.entity.Task;
import com.nexus.work.repository.PlanRepository;
import com.nexus.work.repository.TaskRepository;
import com.nexus.work.security.CurrentUserProvider;
import com.nexus.work.service.DashboardService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardServiceImpl implements DashboardService {

    PlanRepository planRepository;
    TaskRepository taskRepository;
    CurrentUserProvider currentUserProvider;

    @Override
    @Cacheable(value = "dashboard_summary", key = "#root.target.currentUserId()")
    public DashboardSummaryResponse getDashboardSummary() {
        String userId = currentUserProvider.currentUserId();
        List<Plan> plans = planRepository.findAllByOwnerUserId(userId);
        List<Task> tasks = taskRepository.findAllByPlanOwnerUserId(userId);

        long completed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETE).count();
        long inProgress = tasks.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count();
        long pending = tasks.stream().filter(t -> t.getStatus() == TaskStatus.TODO).count();

        return DashboardSummaryResponse.builder()
                .totalPlans(plans.size())
                .totalTasks(tasks.size())
                .completedTasks(completed)
                .inProgressTasks(inProgress)
                .pendingTasks(pending)
                .build();
    }

    public String currentUserId() {
        return currentUserProvider.currentUserId();
    }
}
