package com.impact.gst.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * SpringDoc / Swagger UI configuration.
 * Access at: http://localhost:8080/swagger-ui.html
 * JSON docs: http://localhost:8080/api-docs
 */
@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI gstReconciliationOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("GST Invoice Reconciliation API")
                        .description("""
                                AI-powered GST invoice reconciliation platform.

                                **Key features:**
                                - CSV invoice upload with async vector embedding (Ollama + PGVector)
                                - Automated UPLOADED ↔ GSTR-2B reconciliation
                                - ML risk scoring (Smile RandomForest — local, free)
                                - AI email drafting and risk explanation (Ollama llama3.2 — local, free)
                                - Fraud detection: GSTIN-sharing pattern analysis

                                **All AI models run locally — no paid APIs.**
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("GST Platform Team")
                                .email("gst-platform@impact.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("Local development"),
                        new Server().url("http://gst-app:8080").description("Docker Compose")));
    }
}
