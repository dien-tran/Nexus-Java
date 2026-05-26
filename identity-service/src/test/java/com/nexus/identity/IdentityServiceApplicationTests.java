package com.nexus.identity;

import org.junit.jupiter.api.Test;

class IdentityServiceApplicationTests {

    @Test
    void applicationClassExists() {
        Class<IdentityServiceApplication> applicationClass = IdentityServiceApplication.class;
        org.assertj.core.api.Assertions.assertThat(applicationClass).isNotNull();
    }
}
