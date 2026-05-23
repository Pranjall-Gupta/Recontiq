package com.impact.gst.ml;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RiskFeatureExtractor
 * Step 1: Extracts structured features from a business Mismatch object
 * for consumption by the ML model.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Component
public class RiskFeatureExtractor {

    public double[] extractFeatures(MismatchData m) {
        double[] features = new double[8];

        double amountA = m.getAmountA() != null ? m.getAmountA().doubleValue() : 0.0;
        double amountB = m.getAmountB() != null ? m.getAmountB().doubleValue() : 0.0;

        // 1. amount_diff_ratio: proportional difference between amounts
        features[0] = amountA > 0 ? Math.abs(amountA - amountB) / amountA : 0.0;

        // 2. is_name_mismatch: 1 if vendor names differ significantly, 0 if same
        features[1] = m.isNameMismatch() ? 1.0 : 0.0;

        // 3. vendor_trust_score: from canonical vendors table (0–100 scaled)
        features[2] = m.getVendorTrustScore() != null ? m.getVendorTrustScore() * 100 : 50.0;

        // 4. vendor_age_days: days since first invoice recorded
        features[3] = m.getVendorAgeDays();

        // 5. mismatch_amount_abs: absolute difference in rupees
        features[4] = Math.abs(amountA - amountB);

        // 6. is_gstin_match: boolean mapped to 0 or 1
        features[5] = m.isGstinMatch() ? 1.0 : 0.0;

        // 7. invoice_count_vendor: frequency of operations with this vendor
        features[6] = m.getInvoiceCountVendor();

        // 8. hour_of_filing: time-series proxy for anomalous late night activity
        features[7] = m.getHourOfFiling();

        if (log.isTraceEnabled()) {
            log.trace("Extracted {} features for ML inference", features.length);
        }

        return features;
    }

    public String[] getFeatureNames() {
        return new String[] {
                "amount_diff_ratio",
                "is_name_mismatch",
                "vendor_trust_score",
                "vendor_age_days",
                "mismatch_amount_abs",
                "is_gstin_match",
                "invoice_count_vendor",
                "hour_of_filing"
        };
    }
}
