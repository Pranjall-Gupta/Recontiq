package com.impact.gst.ml;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MismatchData
 * DTO holding inputs required for risk scoring by the ML engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Data
@Builder
public class MismatchData {
    private BigDecimal amountA;
    private BigDecimal amountB;
    private boolean isNameMismatch;
    private Double vendorTrustScore;
    private double vendorAgeDays;
    private boolean isGstinMatch;
    private int invoiceCountVendor;
    private double hourOfFiling;
}
