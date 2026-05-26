package com.nexus.work.kafka;

import com.nexus.common.event.UserCreatedEvent;
import com.nexus.common.kafka.KafkaTopics;
import com.nexus.work.entity.UserProjection;
import com.nexus.work.repository.UserProjectionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserEventConsumer {

    UserProjectionRepository userProjectionRepository;

    @KafkaListener(topics = KafkaTopics.USER_CREATED, groupId = "${spring.kafka.consumer.group-id}")
    public void onUserCreated(UserCreatedEvent event) {
        // Projection nay giup work-service biet user ton tai ma khong doc truc tiep identity database.
        UserProjection projection = UserProjection.builder()
                .userId(event.getUserId())
                .name(event.getName())
                .email(event.getEmail())
                .createdAt(event.getCreatedAt())
                .build();
        userProjectionRepository.save(projection);
    }
}
