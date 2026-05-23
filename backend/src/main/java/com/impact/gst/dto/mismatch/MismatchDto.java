package com.impact.gst.dto.mismatch;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mismatch item in paginated GET /api/v1/reconcile/mismatches
 */
@Data
@Builder
public class MismatchDto {
    private UUID id;
    private UUID invoiceIdA;
    private UUID invoiceIdB;
    private String mismatchType; // NAME | AMOUNT | MISSING | DATE | GSTIN
    private BigDecimal amountDiff;
    private double riskScore;
    private String riskLabel; // low | medium | high | critical
    private String status; // PENDING | RESOLVED | WRITTEN_OFF | ESCALATED
    private String vendorNameA;
    private String vendorNameB;
    private String gstinA;
    private String invoiceNumberA;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
