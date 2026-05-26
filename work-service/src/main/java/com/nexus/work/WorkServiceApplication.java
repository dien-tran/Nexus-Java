package com.nexus.work;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class WorkServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkServiceApplication.class, args);
    }
}
