package com.nexus.common.kafka;

public final class KafkaTopics {
    public static final String USER_CREATED = "identity.user.created.v1";
    public static final String DOCUMENT_UPLOADED = "document.uploaded.v1";
    public static final String DOCUMENT_INGESTION_STATUS = "document.ingestion.status.v1";

    private KafkaTopics() {
    }
}
