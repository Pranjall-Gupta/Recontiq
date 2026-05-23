package com.impact.gst.ml;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RiskResult
 * Output of the risk scoring inference containing human-readable label
 * and model output scores.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Data
@Builder
public class RiskResult {
    private int score; // 0-100 risk score
    private String label; // low, medium, high
    private List<String> topFeatures; // explainability fields
}
