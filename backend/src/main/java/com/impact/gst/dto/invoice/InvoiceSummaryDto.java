package com.impact.gst.dto.invoice;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * Response for GET /api/v1/invoices/summary
 */
@Data
@Builder
public class InvoiceSummaryDto {
    private long total;
    private long matched;
    private long unmatched;
    private long pending;
    private long highRisk;
    private BigDecimal itcAtRisk; // sum of amounts for high-risk mismatches
    private BigDecimal totalTaxAmount;
    private BigDecimal totalAmount;
}
