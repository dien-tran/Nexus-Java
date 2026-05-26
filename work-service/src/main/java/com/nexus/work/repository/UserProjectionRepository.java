package com.nexus.work.repository;

import com.nexus.work.entity.UserProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProjectionRepository extends JpaRepository<UserProjection, String> {
}
