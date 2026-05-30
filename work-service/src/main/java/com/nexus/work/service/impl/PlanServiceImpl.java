package com.nexus.work.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.work.constant.PlanStatus;
import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.dto.response.PlanStatisticsResponse;
import com.nexus.work.entity.Plan;
import com.nexus.work.exception.AppException;
import com.nexus.work.exception.ErrorCode;
import com.nexus.work.mapper.PlanMapper;
import com.nexus.work.repository.PlanRepository;
import com.nexus.work.repository.TaskRepository;
import com.nexus.work.security.CurrentUserProvider;
import com.nexus.work.service.PlanService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
@Transactional(readOnly = true)
public class PlanServiceImpl implements PlanService {

    PlanRepository planRepository;
    TaskRepository taskRepository;
    PlanMapper planMapper;
    CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "plans", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plans_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()")
    })
    public PlanResponse createPlan(CreatePlanRequest request) {
        log.info("Creating new plan for user: {}", currentUserId());
        Plan plan = planMapper.toPlan(request);
        plan.setOwnerUserId(currentUserId());
        return planMapper.toPlanResponse(planRepository.save(plan));
    }

    @Override
    @Cacheable(value = "plans", key = "#root.target.currentUserId()")
    public List<PlanResponse> getPlans() {
        return planMapper.toPlanResponse(planRepository.findAllByOwnerUserId(currentUserId()));
    }

    @Override
    public List<PlanResponse> searchPlans(String name, String status) {
        return planRepository.findAll((root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("ownerUserId"), currentUserId()));
            if (name != null && !name.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), PlanStatus.valueOf(status)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        }).stream().map(planMapper::toPlanResponse).collect(Collectors.toList());
    }

    @Override
    @Cacheable(value = "plans_stats", key = "#root.target.currentUserId()")
    public PlanStatisticsResponse getPlanStatistics() {
        List<Plan> plans = planRepository.findAllByOwnerUserId(currentUserId());
        return PlanStatisticsResponse.builder()
                .totalPlans(plans.size())
                .statusCounts(
                        plans.stream().collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting())))
                .build();
    }

    @Override
    @Cacheable(value = "plan", key = "#root.target.currentUserId() + ':' + #id")
    public PlanResponse getPlanById(String id) {
        Plan plan = getOwnedPlan(id);
        return planMapper.toPlanResponse(plan);
    }

    @Override
    @Transactional
    @Caching(put = @CachePut(value = "plan", key = "#root.target.currentUserId() + ':' + #id"), evict = {
            @CacheEvict(value = "plans", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plans_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()")
    })
    public PlanResponse updatePlan(String id, UpdatePlanRequest request) {
        log.info("Updating plan: {} for user: {}", id, currentUserId());
        Plan plan = getOwnedPlan(id);
        plan = planMapper.toUpdatePlan(plan, request);
        return planMapper.toPlanResponse(planRepository.save(plan));
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "plan", key = "#root.target.currentUserId() + ':' + #id"),
            @CacheEvict(value = "plans", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "tasks", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "plans_stats", key = "#root.target.currentUserId()"),
            @CacheEvict(value = "dashboard_summary", key = "#root.target.currentUserId()")
    })
    public void deletePlan(String id) {
        log.warn("Deleting plan: {} for user: {}", id, currentUserId());
        planRepository.delete(getOwnedPlan(id));
    }

    public String currentUserId() {
        return currentUserProvider.currentUserId();
    }

    private Plan getOwnedPlan(String id) {
        return planRepository.findByIdAndOwnerUserId(id, currentUserId())
                .orElseThrow(() -> {
                    log.error("Plan not found or access denied: {} for user: {}", id, currentUserId());
                    return new AppException(ErrorCode.PLAN_NOT_FOUND);
                });
    }
}
