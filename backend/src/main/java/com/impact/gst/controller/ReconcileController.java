package com.impact.gst.controller;

import com.impact.gst.dto.PagedResponse;
import com.impact.gst.dto.mismatch.MismatchDto;
import com.impact.gst.dto.mismatch.ResolveRequest;
import com.impact.gst.service.ReconciliationJobService;
import com.impact.gst.service.MismatchQueryService;
import com.impact.gst.ml.RiskModelTrainer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/reconcile")
@RequiredArgsConstructor
@Tag(name = "Reconciliation", description = "Run reconciliation jobs and manage mismatches")
public class ReconcileController {

    private final ReconciliationJobService jobService;
    private final MismatchQueryService mismatchQueryService;
    private final RiskModelTrainer modelTrainer;

    // ─── POST /run ────────────────────────────────────────────────────────────
    @Operation(summary = "Trigger full reconciliation job (async)", description = "Reconciles all PENDING uploaded invoices against GSTR-2B. Returns a jobId for polling.")
    @PostMapping("/run")
    public ResponseEntity<Map<String, String>> run() {
        String jobId = jobService.triggerFullReconciliation();
        log.info("Reconciliation job started: {}", jobId);
        return ResponseEntity.accepted().body(Map.of("jobId", jobId, "status", "STARTED"));
    }

    // ─── GET /status/{jobId} ──────────────────────────────────────────────────
    @Operation(summary = "Poll reconciliation job progress")
    @GetMapping("/status/{jobId}")
    public ResponseEntity<Map<String, Object>> jobStatus(@PathVariable String jobId) {
        Map<String, Object> status = jobService.getJobStatus(jobId);
        return ResponseEntity.ok(status);
    }

    // ─── GET /mismatches ──────────────────────────────────────────────────────
    @Operation(summary = "Paginated list of all mismatches, filterable by risk label")
    @GetMapping("/mismatches")
    public ResponseEntity<PagedResponse<MismatchDto>> mismatches(
            @Parameter(description = "Filter by risk label: low|medium|high|critical") @RequestParam(required = false) String riskLabel,

            @Parameter(description = "Filter by mismatch type: NAME|AMOUNT|MISSING|DATE|GSTIN") @RequestParam(required = false) String type,

            @Parameter(description = "Filter by status: PENDING|RESOLVED|WRITTEN_OFF|ESCALATED") @RequestParam(required = false) String status,

            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        return ResponseEntity.ok(
                mismatchQueryService.listMismatches(riskLabel, type, status, page, size));
    }

    // ─── PATCH /mismatches/{id}/resolve ───────────────────────────────────────
    @Operation(summary = "Mark a mismatch as resolved with analyst note")
    @PatchMapping("/mismatches/{id}/resolve")
    public ResponseEntity<MismatchDto> resolve(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveRequest request) {

        return ResponseEntity.ok(mismatchQueryService.resolve(id, request));
    }

    // ─── PATCH /mismatches/{id}/write-off ─────────────────────────────────────
    @Operation(summary = "Write off a mismatch (accept the discrepancy)")
    @PatchMapping("/mismatches/{id}/write-off")
    public ResponseEntity<MismatchDto> writeOff(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveRequest request) {

        return ResponseEntity.ok(mismatchQueryService.writeOff(id, request));
    }

    // ─── PATCH /mismatches/{id}/escalate ──────────────────────────────────────
    @Operation(summary = "Escalate a mismatch")
    @PatchMapping("/mismatches/{id}/escalate")
    public ResponseEntity<MismatchDto> escalate(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveRequest request) {

        return ResponseEntity.ok(mismatchQueryService.escalate(id, request));
    }

    // ─── POST /ml/train ───────────────────────────────────────────────────────
    @Operation(summary = "Retrain the Smile ML Risk Model with updated supplier dataset")
    @PostMapping("/ml/train")
    public ResponseEntity<Map<String, String>> trainModel() {
        log.info("REST request to retrain the Smile ML model");
        modelTrainer.trainModel();
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Smile ML RandomForest risk scoring model successfully retrained on supplier profiles and serialized to models/risk_model.ser"
        ));
    }
}
