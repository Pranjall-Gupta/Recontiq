package com.impact.gst.service;

import com.impact.gst.model.Invoice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * EmbeddingService
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates dense vector embeddings for vendor names using Ollama's
 * {@code nomic-embed-text} model (free, runs locally) and persists them
 * into the {@code invoices.name_embedding} pgvector column.
 *
 * Embedding model: nomic-embed-text (configured in application.yml).
 * Vector dimension: 384 – if you switch to a 768-dim model, update
 * {@code spring.ai.vectorstore.pgvector.dimensions} and the DB column.
 *
 * PGVector string format expected by Postgres: "[0.1,0.2,...,0.384]"
 * We cast with {@code ?::vector} in all native queries.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;
    private final JdbcTemplate jdbc;

    // Batch size for startup embedding run (avoids OOM on large datasets)
    private static final int BATCH_SIZE = 50;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Embed a vendor name string into a float vector using Ollama.
     * The vendor name is normalised before embedding so that casing and
     * common suffixes don't pollute the vector space.
     *
     * @param name raw vendor name (e.g. "Infosys Ltd")
     * @return float[] embedding vector
     */
    public float[] embedVendorName(String name) {
        String normalised = normaliseForEmbedding(name);
        log.debug("Embedding vendor name: '{}' (normalised: '{}')", name, normalised);

        float[] vector = embeddingModel.embed(normalised);
        log.debug("Embedding generated — dims: {}", vector.length);
        return vector;
    }

    /**
     * Embed an invoice's {@code vendor_name} and persist the resulting vector
     * into the {@code name_embedding} column of that invoice row.
     *
     * @param invoice JPA entity with a non-null {@code vendorName}
     */
    @Transactional
    public void embedAndStore(Invoice invoice) {
        if (invoice.getVendorName() == null || invoice.getVendorName().isBlank()) {
            log.warn("Invoice {} has blank vendor_name — skipping embedding", invoice.getId());
            return;
        }

        float[] vector = embedVendorName(invoice.getVendorName());
        String pgVector = toPgVectorString(vector);

        int updated = jdbc.update(
                "UPDATE invoices SET name_embedding = ?::vector WHERE id = ?::uuid",
                pgVector, invoice.getId().toString());

        if (updated == 0) {
            log.warn("No row updated for invoice id={} — does it exist?", invoice.getId());
        } else {
            log.debug("Stored embedding for invoice {} ({})", invoice.getId(), invoice.getVendorName());
        }
    }

    /**
     * Embed an invoice by its UUID (used when the full JPA entity is not loaded).
     *
     * @param invoiceId  UUID of the invoice
     * @param vendorName vendor name to embed
     */
    @Transactional
    public void embedAndStoreById(UUID invoiceId, String vendorName) {
        float[] vector = embedVendorName(vendorName);
        String pgVector = toPgVectorString(vector);

        jdbc.update(
                "UPDATE invoices SET name_embedding = ?::vector WHERE id = ?::uuid",
                pgVector, invoiceId.toString());
        log.debug("Stored embedding for invoice {} by id", invoiceId);
    }

    /**
     * On application startup, embed every invoice that does not yet have a
     * {@code name_embedding} value. Runs asynchronously so startup is not blocked.
     *
     * Bounded by {@link #BATCH_SIZE} rows per batch to control Ollama load.
     */
    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void batchEmbedAll() {
        int totalPending = countPendingEmbeddings();
        if (totalPending == 0) {
            log.info("EmbeddingService — all invoices already embedded, nothing to do.");
            return;
        }

        log.info("EmbeddingService — starting batch embedding of {} invoices...", totalPending);
        int processed = 0;
        int failures = 0;

        // Process in pages — each page fetches IDs + vendor names (lightweight)
        int offset = 0;
        List<Object[]> batch;

        do {
            batch = fetchUnembeddedBatch(offset, BATCH_SIZE);
            for (Object[] row : batch) {
                UUID id = UUID.fromString((String) row[0]);
                String vendorName = (String) row[1];
                try {
                    embedAndStoreById(id, vendorName);
                    processed++;
                } catch (Exception ex) {
                    log.error("Failed to embed invoice {} ({}): {}", id, vendorName, ex.getMessage());
                    failures++;
                }
            }
            offset += BATCH_SIZE;
            log.info("Batch progress: {}/{} embedded, {} errors", processed, totalPending, failures);
        } while (batch.size() == BATCH_SIZE);

        log.info("EmbeddingService — batch complete. Embedded: {}, Failures: {}", processed, failures);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PACKAGE-VISIBLE UTILITY (used by InvoiceMatchingService)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert a float[] vector to the Postgres-compatible pgvector string form.
     * Example: [0.12345,-0.67891,...] (values comma-separated, no spaces)
     */
    String toPgVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1)
                sb.append(',');
        }
        sb.append(']');
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Minimal normalisation before embedding — ensures consistent vector space.
     * Full text normalisation lives in {@link VendorNormalizationService}.
     */
    private String normaliseForEmbedding(String name) {
        return name == null ? "" : name.trim().toUpperCase();
    }

    private int countPendingEmbeddings() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM invoices WHERE name_embedding IS NULL", Integer.class);
        return count == null ? 0 : count;
    }

    private List<Object[]> fetchUnembeddedBatch(int offset, int limit) {
        return jdbc.query(
                "SELECT id::text, vendor_name FROM invoices WHERE name_embedding IS NULL " +
                        "ORDER BY created_at LIMIT ? OFFSET ?",
                (rs, rowNum) -> new Object[] { rs.getString("id"), rs.getString("vendor_name") },
                limit, offset);
    }
}
