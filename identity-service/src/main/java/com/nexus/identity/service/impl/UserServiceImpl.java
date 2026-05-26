package com.nexus.identity.service.impl;

import java.time.Instant;

import com.nexus.common.event.UserCreatedEvent;
import com.nexus.identity.dto.request.CreateUserRequest;
import com.nexus.identity.dto.response.UserResponse;
import com.nexus.identity.entity.User;
import com.nexus.identity.kafka.UserEventProducer;
import com.nexus.identity.mapper.UserMapper;
import com.nexus.identity.repository.UserRepository;
import com.nexus.identity.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {

    UserMapper userMapper;
    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    UserEventProducer userEventProducer;

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        User savedUser = userRepository.save(user);

        // Sau khi identity-service so huu user moi, phat event cho service khac cap nhat projection rieng.
        userEventProducer.publishUserCreated(UserCreatedEvent.builder()
                .userId(savedUser.getId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .createdAt(Instant.now())
                .build());

        return userMapper.toUserResponse(savedUser);
    }
}
