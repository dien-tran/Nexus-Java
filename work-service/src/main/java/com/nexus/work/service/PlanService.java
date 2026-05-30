package com.nexus.work.service;

import java.util.List;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.dto.response.PlanStatisticsResponse;

public interface PlanService {
    PlanResponse createPlan(CreatePlanRequest request);

    List<PlanResponse> getPlans();

    List<PlanResponse> searchPlans(String name, String status);

    PlanStatisticsResponse getPlanStatistics();

    PlanResponse getPlanById(String id);

    PlanResponse updatePlan(String id, UpdatePlanRequest request);

    void deletePlan(String id);
}
