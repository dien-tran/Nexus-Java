package com.nexus.gateway;

import org.junit.jupiter.api.Test;

class ApiGatewayApplicationTests {

    @Test
    void applicationClassExists() {
        Class<ApiGatewayApplication> applicationClass = ApiGatewayApplication.class;
        org.assertj.core.api.Assertions.assertThat(applicationClass).isNotNull();
    }
}
