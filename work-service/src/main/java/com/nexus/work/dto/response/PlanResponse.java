package com.nexus.work.dto.response;

import java.time.LocalDate;
import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlanResponse {
    String id;
    String ownerUserId;
    String name;
    String status;
    String note;
    LocalDate dueDate;
    List<TaskResponse> tasks;
}
