package com.nexus.identity.kafka;

import com.nexus.common.event.UserCreatedEvent;
import com.nexus.common.kafka.KafkaTopics;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserEventProducer {

    KafkaTemplate<String, UserCreatedEvent> kafkaTemplate;

    public void publishUserCreated(UserCreatedEvent event) {
        // Key la userId de cac event cua cung mot user di vao cung partition khi Kafka scale.
        kafkaTemplate.send(KafkaTopics.USER_CREATED, event.getUserId(), event);
    }
}
