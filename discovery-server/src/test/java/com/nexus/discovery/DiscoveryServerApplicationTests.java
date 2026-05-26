package com.nexus.discovery;

import org.junit.jupiter.api.Test;

class DiscoveryServerApplicationTests {

    @Test
    void applicationClassExists() {
        Class<DiscoveryServerApplication> applicationClass = DiscoveryServerApplication.class;
        org.assertj.core.api.Assertions.assertThat(applicationClass).isNotNull();
    }
}
