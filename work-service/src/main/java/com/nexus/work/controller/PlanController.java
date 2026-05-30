package com.nexus.work.controller;

import java.util.List;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.dto.response.PlanStatisticsResponse;
import com.nexus.work.service.PlanService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/plans")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlanController {

    PlanService planService;

    @GetMapping
    public List<PlanResponse> getPlans(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String status) {
        if (name != null || status != null) {
            return planService.searchPlans(name, status);
        }
        return planService.getPlans();
    }

    @GetMapping("/statistics")
    public PlanStatisticsResponse getPlanStatistics() {
        return planService.getPlanStatistics();
    }

    @PostMapping
    public PlanResponse createPlan(@RequestBody CreatePlanRequest request) {
        return planService.createPlan(request);
    }

    @GetMapping("/{id}")
    public PlanResponse getPlanById(@PathVariable String id) {
        return planService.getPlanById(id);
    }

    @PutMapping("/{id}")
    public PlanResponse updatePlan(@PathVariable String id, @RequestBody UpdatePlanRequest request) {
        return planService.updatePlan(id, request);
    }

    @DeleteMapping("/{id}")
    public String deletePlan(@PathVariable String id) {
        planService.deletePlan(id);
        return "Plan deleted successfully";
    }
}
