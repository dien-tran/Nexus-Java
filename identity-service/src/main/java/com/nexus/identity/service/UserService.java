package com.nexus.identity.service;

import com.nexus.identity.dto.request.CreateUserRequest;
import com.nexus.identity.dto.response.UserResponse;

public interface UserService {
    UserResponse createUser(CreateUserRequest request);
}
