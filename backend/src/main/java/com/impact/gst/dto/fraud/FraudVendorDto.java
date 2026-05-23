package com.impact.gst.dto.fraud;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Row in GET /api/v1/fraud/suspicious-vendors */
@Data
@Builder
public class FraudVendorDto {
    private UUID vendorId;
    private String gstin;
    private String canonicalName;
    private List<String> nameVariants; // distinct names sharing this GSTIN
    private int mismatchCount;
    private double trustScore;
    private BigDecimal totalMismatchAmount;
    private String riskReason; // e.g. "3 companies share same GSTIN"
}
