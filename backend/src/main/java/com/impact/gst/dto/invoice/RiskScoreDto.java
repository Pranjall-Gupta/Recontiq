package com.impact.gst.dto.invoice;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/** Embedded risk score block inside invoice detail response. */
@Data
@Builder
public class RiskScoreDto {
    private double score;
    private String label; // low | medium | high | critical
    private List<String> topFeatures;
    private String modelVersion;
}
