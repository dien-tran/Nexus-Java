package com.nexus.work.mapper;

import java.util.List;

import com.nexus.work.dto.request.CreateTaskRequest;
import com.nexus.work.dto.request.UpdateTaskRequest;
import com.nexus.work.dto.response.TaskResponse;
import com.nexus.work.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TaskMapper {



    @Mapping(target = "id", ignore = true)
    @Mapping(target = "plan", ignore = true)
    Task toTask(CreateTaskRequest request);

    @Mapping(target = "planId", source = "plan.id")
    TaskResponse toTaskResponse(Task task);

    List<TaskResponse> toTaskResponse(List<Task> task);

    void UpdateTaskRequest(UpdateTaskRequest request, @MappingTarget Task task);
}
