package com.nexus.work;

import org.junit.jupiter.api.Test;

class WorkServiceApplicationTests {

    @Test
    void applicationClassExists() {
        Class<WorkServiceApplication> applicationClass = WorkServiceApplication.class;
        org.assertj.core.api.Assertions.assertThat(applicationClass).isNotNull();
    }
}
