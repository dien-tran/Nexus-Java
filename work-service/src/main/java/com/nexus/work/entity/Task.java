package com.nexus.work.entity;

import java.time.LocalDate;

import com.nexus.work.constant.Priority;
import com.nexus.work.constant.TaskStatus;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    String name;
    String description;
    LocalDate startDate;
    LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    TaskStatus status;

    @Enumerated(EnumType.STRING)
    Priority priority;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    Plan plan;
}
