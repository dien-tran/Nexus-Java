package com.nexus.work.dto.request;

import java.time.LocalDate;

import lombok.Builder;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTaskRequest {
    String name;
    String description;
    LocalDate startDate;
    LocalDate dueDate;
    String status; // "Todo", "In Progress", "Review", "Complete"
    String priority; // "Low", "Medium", "High", "Urgent"
}
