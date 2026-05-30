package com.nexus.work.repository;

import java.util.List;

import com.nexus.work.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<Task, String>, JpaSpecificationExecutor<Task> {
    List<Task> findAllByPlanOwnerUserId(String ownerUserId);
}
