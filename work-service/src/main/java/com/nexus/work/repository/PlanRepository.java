package com.nexus.work.repository;

import java.util.List;
import java.util.Optional;

import com.nexus.work.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanRepository extends JpaRepository<Plan, String> {
    List<Plan> findAllByOwnerUserId(String ownerUserId);

    Optional<Plan> findByIdAndOwnerUserId(String id, String ownerUserId);
}
