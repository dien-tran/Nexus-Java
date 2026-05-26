package com.nexus.work.service;

import java.util.List;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;

public interface PlanService {
    PlanResponse createPlan(CreatePlanRequest request);

    List<PlanResponse> getPlans();

    PlanResponse getPlanById(String id);

    PlanResponse updatePlan(String id, UpdatePlanRequest request);

    void deletePlan(String id);
}
