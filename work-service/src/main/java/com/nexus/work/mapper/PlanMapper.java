package com.nexus.work.mapper;

import java.util.List;

import com.nexus.work.dto.request.CreatePlanRequest;
import com.nexus.work.dto.request.UpdatePlanRequest;
import com.nexus.work.dto.response.PlanResponse;
import com.nexus.work.entity.Plan;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", uses = { TaskMapper.class })
public interface PlanMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerUserId", ignore = true)
    @Mapping(target = "tasks", ignore = true)
    @Mapping(target = "dueDate", ignore = true)
    Plan toPlan(CreatePlanRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerUserId", ignore = true)
    @Mapping(target = "tasks", ignore = true)
    @Mapping(target = "dueDate", ignore = true)
    Plan toUpdatePlan(@MappingTarget Plan plan, UpdatePlanRequest request);

    PlanResponse toPlanResponse(Plan plan);

    List<PlanResponse> toPlanResponse(List<Plan> plan);
}
