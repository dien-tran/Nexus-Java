package com.nexus.work.service.impl;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.entity.Plan;
import com.nexus.work.exception.AppException;
import com.nexus.work.exception.ErrorCode;
import com.nexus.work.mapper.PlanMapper;
import com.nexus.work.repository.PlanRepository;
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
    PlanMapper planMapper;
    CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    @CacheEvict(value = "plans", key = "#root.target.currentUserId()")
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
    @Cacheable(value = "plan", key = "#root.target.currentUserId() + ':' + #id")
    public PlanResponse getPlanById(String id) {
        Plan plan = getOwnedPlan(id);
        return planMapper.toPlanResponse(plan);
    }

    @Override
    @Transactional
    @Caching(
            put = @CachePut(value = "plan", key = "#root.target.currentUserId() + ':' + #id"),
            evict = @CacheEvict(value = "plans", key = "#root.target.currentUserId()")
    )
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
            @CacheEvict(value = "tasks", key = "#root.target.currentUserId()")
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
