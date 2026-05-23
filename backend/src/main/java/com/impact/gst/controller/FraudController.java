package com.impact.gst.controller;

import com.impact.gst.dto.fraud.FraudVendorDto;
import com.impact.gst.dto.fraud.GraphDto;
import com.impact.gst.service.FraudDetectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fraud")
@RequiredArgsConstructor
@Tag(name = "Fraud Detection", description = "Identify suspicious vendors and GSTIN sharing patterns")
public class FraudController {

    private final FraudDetectionService fraudService;

    // ─── GET /suspicious-vendors ──────────────────────────────────────────────
    @Operation(summary = "List vendors with multiple GSTIN matches or high mismatch rates", description = "Returns vendors sharing a GSTIN with other companies or with trust score < 0.5")
    @GetMapping("/suspicious-vendors")
    public ResponseEntity<List<FraudVendorDto>> suspiciousVendors(
            @RequestParam(defaultValue = "0.5") double maxTrustScore,
            @RequestParam(defaultValue = "2") int minMismatchCount) {
        return ResponseEntity.ok(
                fraudService.findSuspiciousVendors(maxTrustScore, minMismatchCount));
    }

    // ─── GET /graph ───────────────────────────────────────────────────────────
    @Operation(summary = "Fraud relationship graph: nodes (vendor/GSTIN/invoice) and edges", description = "Returns a graph payload suitable for D3.js or Cytoscape visualisation")
    @GetMapping("/graph")
    public ResponseEntity<GraphDto> graph(
            @RequestParam(defaultValue = "0.5") double maxTrustScore) {
        return ResponseEntity.ok(fraudService.buildFraudGraph(maxTrustScore));
    }
}
