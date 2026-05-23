package com.impact.gst.dto.invoice;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Embedded match summary returned inside GET /invoices/{id} */
@Data
@Builder
public class InvoiceMatchDto {
    private UUID matchedInvoiceId;
    private String vendorName;
    private BigDecimal amount;
    private LocalDate invoiceDate;
    private String source;
    private double similarity; // 0.0 – 1.0
    private String matchStrength; // STRONG | POSSIBLE | NONE
}
