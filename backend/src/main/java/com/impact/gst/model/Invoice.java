package com.impact.gst.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA entity mapping to the {@code invoices} table.
 *
 * NOTE: The {@code name_embedding} vector column is intentionally excluded from
 * JPA mapping — pgvector types require native JDBC writes.
 * Use {@link com.impact.gst.service.EmbeddingService} for all embedding I/O.
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "rawData")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Column(name = "vendor_name", nullable = false, length = 255)
    private String vendorName;

    @Column(name = "gstin", nullable = false, length = 15)
    private String gstin;

    @Column(name = "invoice_number", nullable = false, length = 100)
    private String invoiceNumber;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, columnDefinition = "invoice_source")
    private InvoiceSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "invoice_status")
    private InvoiceStatus status;

    @Column(name = "file_reference")
    private String fileReference;

    @Column(name = "raw_data", columnDefinition = "jsonb")
    private String rawData;

    // name_embedding (vector) is managed via JdbcTemplate in EmbeddingService

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
