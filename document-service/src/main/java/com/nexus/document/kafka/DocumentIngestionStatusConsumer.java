package com.nexus.document.kafka;

import com.nexus.common.event.DocumentIngestionStatusEvent;
import com.nexus.common.kafka.KafkaTopics;
import com.nexus.document.service.DocumentService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class DocumentIngestionStatusConsumer {

    DocumentService documentService;

    @KafkaListener(topics = KafkaTopics.DOCUMENT_INGESTION_STATUS, groupId = "${spring.kafka.consumer.group-id}")
    public void onIngestionStatus(DocumentIngestionStatusEvent event) {
        log.info("Applying ingestion status documentId={} status={}", event.getDocumentId(), event.getStatus());
        documentService.applyIngestionStatus(event);
    }
}
