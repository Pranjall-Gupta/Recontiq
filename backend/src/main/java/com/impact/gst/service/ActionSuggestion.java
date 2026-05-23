package com.impact.gst.service;

import lombok.Builder;
import lombok.Data;

/**
 * Result returned by AgentService.suggestAction().
 *
 * action — one of: auto_resolve | request_vendor_correction |
 * escalate_to_ca | write_off
 * reason — plain-English rationale from the LLM
 * confidence — 0.0–1.0 model confidence in its recommendation
 */
@Data
@Builder
public class ActionSuggestion {

    private String action;
    private String reason;
    private double confidence;

    // Convenience factory for fallback (rule-based) suggestions
    public static ActionSuggestion ruleBasedFallback(double riskScore) {
        if (riskScore >= 0.85) {
            return ActionSuggestion.builder()
                    .action("escalate_to_ca")
                    .reason("Risk score is critical (>=0.85). Escalation required. Ollama unavailable for detailed analysis.")
                    .confidence(0.70)
                    .build();
        } else if (riskScore >= 0.60) {
            return ActionSuggestion.builder()
                    .action("request_vendor_correction")
                    .reason("High-risk mismatch. Vendor should issue corrected invoice or credit note.")
                    .confidence(0.65)
                    .build();
        } else if (riskScore >= 0.40) {
            return ActionSuggestion.builder()
                    .action("request_vendor_correction")
                    .reason("Medium-risk mismatch. Likely a rounding/naming error; clarification needed.")
                    .confidence(0.60)
                    .build();
        } else {
            return ActionSuggestion.builder()
                    .action("auto_resolve")
                    .reason("Low-risk mismatch. Difference is within acceptable tolerance.")
                    .confidence(0.80)
                    .build();
        }
    }
}
