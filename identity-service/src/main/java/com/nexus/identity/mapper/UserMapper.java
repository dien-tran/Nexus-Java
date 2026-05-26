package com.nexus.identity.mapper;

import com.nexus.identity.dto.request.CreateUserRequest;
import com.nexus.identity.dto.response.UserResponse;
import com.nexus.identity.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    User toUser(CreateUserRequest request);

    UserResponse toUserResponse(User user);
}
