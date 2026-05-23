package com.impact.gst.service;

import com.impact.gst.service.InvoiceMatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages async reconciliation jobs using Spring @Async + in-memory job
 * tracker.
 *
 * NOTE: For production, replace the ConcurrentHashMap with a Redis-backed job
 * store
 * or JobRunr (jobrunr.io, free open-source tier) for persistence and retries.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReconciliationJobService {

    private final JdbcTemplate jdbc;
    private final InvoiceMatchingService matchingService;

    // In-memory job registry: jobId → status map
    private final ConcurrentHashMap<String, JobState> jobs = new ConcurrentHashMap<>();

    // ─── triggerFullReconciliation ────────────────────────────────────────────

    public String triggerFullReconciliation() {
        String jobId = UUID.randomUUID().toString();
        jobs.put(jobId, new JobState(0, "RUNNING", 0));
        runReconciliation(jobId);
        return jobId;
    }

    // ─── getJobStatus ─────────────────────────────────────────────────────────

    public Map<String, Object> getJobStatus(String jobId) {
        JobState state = jobs.get(jobId);
        if (state == null) {
            return Map.of("jobId", jobId, "status", "NOT_FOUND");
        }
        return Map.of(
                "jobId", jobId,
                "status", state.status(),
                "progress", state.progressPct(),
                "processed", state.processed());
    }

    // ─── ASYNC EXECUTION ──────────────────────────────────────────────────────

    @Async
    protected void runReconciliation(String jobId) {
        try {
            // Fetch all PENDING uploaded invoice IDs
            List<String> pendingIds = jdbc.queryForList(
                    "SELECT id::text FROM invoices WHERE source = 'UPLOADED' AND status = 'PENDING'",
                    String.class);

            int total = pendingIds.size();
            log.info("Reconciliation job {} — processing {} invoices", jobId, total);

            if (total == 0) {
                jobs.put(jobId, new JobState(100, "COMPLETED", 0));
                return;
            }

            int processed = 0;
            for (String rawId : pendingIds) {
                try {
                    matchingService.reconcile(UUID.fromString(rawId));
                } catch (Exception ex) {
                    log.warn("Reconcile failed for invoice {}: {}", rawId, ex.getMessage());
                }
                processed++;
                int pct = (processed * 100) / total;
                jobs.put(jobId, new JobState(pct, "RUNNING", processed));
            }

            jobs.put(jobId, new JobState(100, "COMPLETED", processed));
            log.info("Reconciliation job {} complete — {} invoices processed", jobId, processed);

        } catch (Exception ex) {
            log.error("Reconciliation job {} failed: {}", jobId, ex.getMessage(), ex);
            jobs.put(jobId, new JobState(0, "FAILED", 0));
        }
    }

    // ─── INNER RECORD ─────────────────────────────────────────────────────────
    record JobState(int progressPct, String status, int processed) {
    }
}
