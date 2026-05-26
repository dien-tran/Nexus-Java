package com.nexus.work.controller;

import java.util.List;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.service.PlanService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PlanController {

    PlanService planService;

    @GetMapping
    public List<PlanResponse> getPlans() {
        return planService.getPlans();
    }

    @PostMapping("/create")
    public PlanResponse createPlan(@RequestBody CreatePlanRequest request) {
        return planService.createPlan(request);
    }

    @GetMapping("/{id}")
    public PlanResponse getPlanById(@PathVariable String id) {
        return planService.getPlanById(id);
    }

    @PutMapping("/update/{id}")
    public PlanResponse updatePlan(@PathVariable String id, @RequestBody UpdatePlanRequest request) {
        return planService.updatePlan(id, request);
    }

    @DeleteMapping("/delete/{id}")
    public String deletePlan(@PathVariable String id) {
        planService.deletePlan(id);
        return "Plan deleted successfully";
    }
}
