package com.nexus.document.kafka;

import com.nexus.common.event.DocumentUploadedEvent;
import com.nexus.common.kafka.KafkaTopics;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentEventProducer {

    KafkaTemplate<String, DocumentUploadedEvent> kafkaTemplate;

    public void publishDocumentUploaded(DocumentUploadedEvent event) {
        kafkaTemplate.send(KafkaTopics.DOCUMENT_UPLOADED, event.getDocumentId(), event);
    }
}
