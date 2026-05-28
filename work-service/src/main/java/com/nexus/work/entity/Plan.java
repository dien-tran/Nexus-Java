package com.nexus.work.entity;

import java.time.LocalDate;
import java.util.List;

import com.nexus.work.constant.PlanStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Plan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false)
    String ownerUserId;

    String name;

    @Enumerated(EnumType.STRING)
    PlanStatus status;

    String note;
    LocalDate dueDate;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL)
    List<Task> tasks;
}
