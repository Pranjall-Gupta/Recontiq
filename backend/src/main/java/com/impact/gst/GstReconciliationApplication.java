package com.impact.gst;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * GST Invoice Reconciliation Platform
 *
 * @EnableAsync — required by EmbeddingService.batchEmbedAll()
 * @EnableCaching — Redis cache activated
 * @EnableScheduling — for future scheduled reconciliation jobs
 */
@SpringBootApplication
@EnableAsync
@EnableCaching
@EnableScheduling
public class GstReconciliationApplication {

    public static void main(String[] args) {
        SpringApplication.run(GstReconciliationApplication.class, args);
    }
}
