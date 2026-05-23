package com.impact.gst.service;

import com.impact.gst.ml.MismatchData;
import com.impact.gst.ml.RiskResult;
import com.impact.gst.ml.RiskScoringService;
import com.impact.gst.model.InvoiceSource;
import com.impact.gst.model.InvoiceStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * InvoiceMatchingService
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds semantically similar invoices using PGVector cosine distance and
 * drives the reconciliation pipeline between UPLOADED and GSTR-2B rows.
 *
 * Similarity thresholds (cosine distance — lower = more similar):
 * distance ≤ 0.15 → cosine similarity ≥ 0.85 → STRONG_MATCH
 * distance ≤ 0.30 → cosine similarity ≥ 0.70 → POSSIBLE_MATCH
 * distance > 0.30 → NO_MATCH
 *
 * <p>
 * Note: PGVector's {@code <=>} operator returns cosine DISTANCE (0=identical,
 * 2=opposite). We convert to similarity for human-readable thresholds:
 * similarity = 1 - distance
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceMatchingService {

    private final JdbcTemplate jdbc;
    private final EmbeddingService embeddingService;
    private final VendorNormalizationService normService;
    private final RiskScoringService riskScoringService;

    // Cosine distance thresholds (distance = 1 - similarity)
    public static final double STRONG_MATCH_DISTANCE = 0.15; // similarity >= 0.85
    public static final double POSSIBLE_MATCH_DISTANCE = 0.30; // similarity >= 0.70

    // Amount mismatch tolerance: ₹500 or 0.5% of amount (whichever is larger)
    private static final BigDecimal AMOUNT_TOLERANCE_ABSOLUTE = new BigDecimal("500.00");
    private static final double AMOUNT_TOLERANCE_PCT = 0.005; // 0.5%

    // ─────────────────────────────────────────────────────────────────────────
    // SIMILARITY SEARCH
    // ─────────────────────────────────────────────────────────────────────────

    // ... (findSimilarInvoices methods remain unchanged) ...

    /**
     * Find invoices whose {@code name_embedding} is within cosine distance
     * {@code threshold} of the embedding of {@code vendorName}.
     *
     * @param vendorName raw vendor name to search for
     * @param threshold  maximum cosine DISTANCE to include (e.g. 0.30 for possible
     *                   match)
     * @param source     restrict results to UPLOADED or GSTR2B (null = both)
     * @param topK       maximum rows to return
     * @return list of matching invoice row projections ordered by similarity
     */
    public List<InvoiceMatch> findSimilarInvoices(String vendorName,
            double threshold,
            InvoiceSource source,
            int topK) {
        float[] embedding = embeddingService.embedVendorName(vendorName);
        String pgVector = embeddingService.toPgVectorString(embedding);

        String sql = """
                SELECT id::text,
                       vendor_name,
                       gstin,
                       invoice_number,
                       amount,
                       tax_amount,
                       invoice_date,
                       source::text,
                       status::text,
                       (name_embedding <=> ?::vector) AS distance
                FROM   invoices
                WHERE  name_embedding IS NOT NULL
                  AND  (name_embedding <=> ?::vector) <= ?
                  AND  (?::text IS NULL OR source = ?::invoice_source)
                ORDER  BY distance
                LIMIT  ?
                """;

        String sourceStr = (source != null) ? source.name() : null;

        return jdbc.query(sql,
                (rs, rowNum) -> InvoiceMatch.builder()
                        .id(UUID.fromString(rs.getString("id")))
                        .vendorName(rs.getString("vendor_name"))
                        .gstin(rs.getString("gstin"))
                        .invoiceNumber(rs.getString("invoice_number"))
                        .amount(rs.getBigDecimal("amount"))
                        .taxAmount(rs.getBigDecimal("tax_amount"))
                        .invoiceDate(rs.getObject("invoice_date", LocalDate.class))
                        .source(InvoiceSource.valueOf(rs.getString("source")))
                        .status(InvoiceStatus.valueOf(rs.getString("status")))
                        .distance(rs.getDouble("distance"))
                        .similarity(1.0 - rs.getDouble("distance"))
                        .matchStrength(classifyDistance(rs.getDouble("distance")))
                        .build(),
                pgVector, pgVector, threshold, sourceStr, sourceStr, topK);
    }

    /**
     * Convenience overload: search GSTR2B entries, top-10, possible-match
     * threshold.
     */
    public List<InvoiceMatch> findSimilarInvoices(String vendorName, double threshold) {
        return findSimilarInvoices(vendorName, threshold, InvoiceSource.GSTR2B, 10);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECONCILIATION ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Reconcile a single UPLOADED invoice against GSTR-2B entries.
     */
    @Transactional
    public ReconciliationResult reconcile(UUID uploadedInvoiceId) {
        // Step 1: load the UPLOADED invoice
        InvoiceMatch uploaded = loadInvoice(uploadedInvoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + uploadedInvoiceId));

        if (uploaded.getSource() != InvoiceSource.UPLOADED) {
            throw new IllegalStateException("Only UPLOADED invoices can be reconciled, got: " + uploaded.getSource());
        }

        log.info("Reconciling uploaded invoice {} ({} / {})",
                uploadedInvoiceId, uploaded.getVendorName(), uploaded.getInvoiceNumber());

        // Step 2: exact match by invoice_number + GSTIN from GSTR-2B
        Optional<InvoiceMatch> exactMatch = findExactGstr2bMatch(
                uploaded.getInvoiceNumber(), uploaded.getGstin());

        if (exactMatch.isPresent()) {
            return reconcileWithCandidate(uploaded, exactMatch.get(), MatchMethod.EXACT);
        }

        // Step 3: fuzzy match by vector similarity on vendor name + same GSTIN
        List<InvoiceMatch> fuzzyMatches = findSimilarInvoices(
                uploaded.getVendorName(), POSSIBLE_MATCH_DISTANCE, InvoiceSource.GSTR2B, 5);

        // Filter: same GSTIN, same invoice number (case-insensitive) or close date
        Optional<InvoiceMatch> fuzzyBest = fuzzyMatches.stream()
                .filter(m -> m.getGstin().equalsIgnoreCase(uploaded.getGstin()))
                .filter(m -> m.getInvoiceNumber().equalsIgnoreCase(uploaded.getInvoiceNumber())
                        || daysApart(uploaded.getInvoiceDate(), m.getInvoiceDate()) <= 5)
                .findFirst();

        if (fuzzyBest.isPresent()) {
            return reconcileWithCandidate(uploaded, fuzzyBest.get(), MatchMethod.FUZZY_VECTOR);
        }

        // Step 4: no GSTR-2B counterpart found → MISSING mismatch
        return handleMissing(uploaded);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — MATCH DECISION LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    private ReconciliationResult reconcileWithCandidate(InvoiceMatch uploaded,
            InvoiceMatch gstr2b,
            MatchMethod method) {
        MismatchType mismatch = detectMismatch(uploaded, gstr2b);

        if (mismatch == MismatchType.NONE) {
            markStatus(uploaded.getId(), "MATCHED");
            markStatus(gstr2b.getId(), "MATCHED");
            log.info("  → MATCHED via {} (invoice {})", method, uploaded.getInvoiceNumber());
            return ReconciliationResult.matched(uploaded.getId(), gstr2b.getId(), method);
        }

        // Mismatch — Use ML to compute risk
        markStatus(uploaded.getId(), "MISMATCHED");
        markStatus(gstr2b.getId(), "MISMATCHED");

        BigDecimal amountDiff = uploaded.getAmount().subtract(gstr2b.getAmount()).abs();

        // Collect features for ML model
        MismatchData mData = MismatchData.builder()
                .amountA(uploaded.getAmount())
                .amountB(gstr2b.getAmount())
                .isNameMismatch(mismatch == MismatchType.NAME)
                .isGstinMatch(uploaded.getGstin().equalsIgnoreCase(gstr2b.getGstin()))
                .hourOfFiling(10.0) // Dummy: Extract from timestamp in prod
                .build();
        enrichWithVendorStats(mData, uploaded.getGstin());

        RiskResult risk = riskScoringService.scoreRisk(mData);
        double riskScore = risk.getScore() / 100.0; // scale to 0-1

        // Elevate risk score if there is a tax rate or type anomaly
        boolean hasTaxAnomaly = !isStandardIndianTaxRate(uploaded.getAmount(), uploaded.getTaxAmount())
                || !isStandardIndianTaxRate(gstr2b.getAmount(), gstr2b.getTaxAmount())
                || hasTaxTypeDiscrepancy(uploaded)
                || hasTaxTypeDiscrepancy(gstr2b);

        if (hasTaxAnomaly) {
            riskScore = Math.min(0.99, riskScore + 0.35); // elevate risk score
        }

        UUID mismatchId = insertMismatchRecord(
                uploaded.getId(), gstr2b.getId(), mismatch, amountDiff, riskScore);

        log.info("  → MISMATCHED via {} — type={} diff={} risk={} (invoice {})",
                method, mismatch, amountDiff, riskScore, uploaded.getInvoiceNumber());

        return ReconciliationResult.mismatched(
                uploaded.getId(), gstr2b.getId(), mismatch, amountDiff, riskScore, mismatchId);
    }

    private ReconciliationResult handleMissing(InvoiceMatch uploaded) {
        markStatus(uploaded.getId(), "MISMATCHED");

        MismatchData mData = MismatchData.builder()
                .amountA(uploaded.getAmount())
                .amountB(null)
                .isNameMismatch(true)
                .isGstinMatch(false)
                .hourOfFiling(12.0)
                .build();
        enrichWithVendorStats(mData, uploaded.getGstin());

        RiskResult risk = riskScoringService.scoreRisk(mData);
        double riskScore = risk.getScore() / 100.0;

        UUID mismatchId = insertMismatchRecord(
                uploaded.getId(), null, MismatchType.MISSING, null, riskScore);

        log.info("  → MISSING from GSTR-2B (invoice {}) — mismatch {} created",
                uploaded.getInvoiceNumber(), mismatchId);

        return ReconciliationResult.missing(uploaded.getId(), riskScore, mismatchId);
    }

    private void enrichWithVendorStats(MismatchData mData, String gstin) {
        jdbc.query("SELECT trust_score, mismatch_history_count, created_at FROM vendors WHERE gstin = ?",
                rs -> {
                    if (rs.next()) {
                        mData.setVendorTrustScore(rs.getDouble("trust_score"));
                        mData.setInvoiceCountVendor(rs.getInt("mismatch_history_count"));
                        // vendor age... simplified
                        mData.setVendorAgeDays(180.0);
                    } else {
                        mData.setVendorTrustScore(0.5); // neutral for unknown
                    }
                }, gstin);
    }

    private MismatchType detectMismatch(InvoiceMatch a, InvoiceMatch b) {
        // Name mismatch (beyond embedding — compare raw names after normalisation)
        String normA = normService.normalize(a.getVendorName());
        String normB = normService.normalize(b.getVendorName());
        if (!normA.equalsIgnoreCase(normB)) {
            return MismatchType.NAME;
        }

        // Amount mismatch (beyond tolerance)
        BigDecimal diff = a.getAmount().subtract(b.getAmount()).abs();
        BigDecimal pctLimit = a.getAmount()
                .multiply(BigDecimal.valueOf(AMOUNT_TOLERANCE_PCT))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal tolerance = AMOUNT_TOLERANCE_ABSOLUTE.max(pctLimit);

        if (diff.compareTo(tolerance) > 0) {
            return MismatchType.AMOUNT;
        }

        // Tax Amount mismatch
        BigDecimal taxDiff = a.getTaxAmount().subtract(b.getTaxAmount()).abs();
        BigDecimal taxPctLimit = a.getTaxAmount()
                .multiply(BigDecimal.valueOf(AMOUNT_TOLERANCE_PCT))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxTolerance = AMOUNT_TOLERANCE_ABSOLUTE.max(taxPctLimit);
        if (taxDiff.compareTo(taxTolerance) > 0) {
            return MismatchType.AMOUNT;
        }

        // Tax Rate slab anomaly check
        if (!isStandardIndianTaxRate(a.getAmount(), a.getTaxAmount()) || !isStandardIndianTaxRate(b.getAmount(), b.getTaxAmount())) {
            return MismatchType.AMOUNT;
        }

        // Tax Type split check based on state code and raw data
        if (hasTaxTypeDiscrepancy(a) || hasTaxTypeDiscrepancy(b)) {
            return MismatchType.AMOUNT;
        }

        // Date mismatch (> 5 days apart or different financial year)
        if (getFinancialYear(a.getInvoiceDate()) != getFinancialYear(b.getInvoiceDate())) {
            return MismatchType.DATE;
        }

        if (daysApart(a.getInvoiceDate(), b.getInvoiceDate()) > 5) {
            return MismatchType.DATE;
        }

        return MismatchType.NONE;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — DB HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Optional<InvoiceMatch> loadInvoice(UUID id) {
        List<InvoiceMatch> rows = jdbc.query(
                """
                        SELECT id::text, vendor_name, gstin, invoice_number, amount, tax_amount,
                               invoice_date, source::text, status::text,
                               0.0 AS distance
                        FROM   invoices WHERE id = ?::uuid
                        """,
                invoiceMatchRowMapper(),
                id.toString());
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private Optional<InvoiceMatch> findExactGstr2bMatch(String invoiceNumber, String gstin) {
        List<InvoiceMatch> rows = jdbc.query(
                """
                        SELECT id::text, vendor_name, gstin, invoice_number, amount, tax_amount,
                               invoice_date, source::text, status::text,
                               0.0 AS distance
                        FROM   invoices
                        WHERE  source = 'GSTR2B'::invoice_source
                          AND  LOWER(invoice_number) = LOWER(?)
                          AND  gstin = ?
                        LIMIT  1
                        """,
                invoiceMatchRowMapper(),
                invoiceNumber, gstin);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private void markStatus(UUID invoiceId, String status) {
        jdbc.update(
                "UPDATE invoices SET status = ?::invoice_status WHERE id = ?::uuid",
                status, invoiceId.toString());
    }

    private UUID insertMismatchRecord(UUID uploadedId, UUID gstr2bId,
            MismatchType type, BigDecimal diff, double riskScore) {
        UUID mismatchId = UUID.randomUUID();
        jdbc.update(
                """
                        INSERT INTO mismatches
                            (id, invoice_id_a, invoice_id_b, mismatch_type, amount_diff, risk_score, status)
                        VALUES
                            (?::uuid, ?::uuid, ?::uuid, ?::mismatch_type, ?, ?, 'PENDING'::mismatch_status)
                        """,
                mismatchId.toString(),
                uploadedId.toString(),
                gstr2bId != null ? gstr2bId.toString() : null,
                type.name(),
                diff,
                BigDecimal.valueOf(riskScore).setScale(4, RoundingMode.HALF_UP));
        return mismatchId;
    }

    private org.springframework.jdbc.core.RowMapper<InvoiceMatch> invoiceMatchRowMapper() {
        return (rs, rowNum) -> InvoiceMatch.builder()
                .id(UUID.fromString(rs.getString("id")))
                .vendorName(rs.getString("vendor_name"))
                .gstin(rs.getString("gstin"))
                .invoiceNumber(rs.getString("invoice_number"))
                .amount(rs.getBigDecimal("amount"))
                .taxAmount(rs.getBigDecimal("tax_amount"))
                .invoiceDate(rs.getObject("invoice_date", LocalDate.class))
                .source(InvoiceSource.valueOf(rs.getString("source")))
                .status(InvoiceStatus.valueOf(rs.getString("status")))
                .distance(rs.getDouble("distance"))
                .similarity(1.0 - rs.getDouble("distance"))
                .matchStrength(classifyDistance(rs.getDouble("distance")))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — UTILS
    // ─────────────────────────────────────────────────────────────────────────

    private MatchStrength classifyDistance(double distance) {
        if (distance <= STRONG_MATCH_DISTANCE)
            return MatchStrength.STRONG;
        if (distance <= POSSIBLE_MATCH_DISTANCE)
            return MatchStrength.POSSIBLE;
        return MatchStrength.NONE;
    }

    private double computeRiskScore(MismatchType type, BigDecimal diff, BigDecimal baseAmount) {
        return switch (type) {
            case MISSING -> 0.85;
            case AMOUNT -> {
                if (baseAmount == null || baseAmount.compareTo(BigDecimal.ZERO) == 0)
                    yield 0.5;
                double pct = diff.divide(baseAmount, 6, RoundingMode.HALF_UP).doubleValue();
                yield Math.min(0.95, 0.30 + pct * 2); // scales with % difference, caps at 0.95
            }
            case NAME -> 0.45;
            case DATE -> 0.30;
            case GSTIN -> 0.95;
            default -> 0.20;
        };
    }

    private long daysApart(LocalDate a, LocalDate b) {
        return Math.abs(a.toEpochDay() - b.toEpochDay());
    }

    private int getFinancialYear(LocalDate date) {
        return (date.getMonthValue() >= 4) ? date.getYear() : date.getYear() - 1;
    }

    private boolean isStandardIndianTaxRate(BigDecimal amount, BigDecimal taxAmount) {
        if (amount == null || taxAmount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return true;
        }
        double rate = taxAmount.multiply(BigDecimal.valueOf(100.0))
                            .divide(amount, 4, RoundingMode.HALF_UP).doubleValue();
        double[] standardRates = {0.0, 5.0, 12.0, 18.0, 28.0};
        for (double standardRate : standardRates) {
            if (Math.abs(rate - standardRate) < 0.5) {
                return true;
            }
        }
        return false;
    }

    private boolean hasTaxTypeDiscrepancy(InvoiceMatch inv) {
        try {
            String rawData = jdbc.queryForObject("SELECT raw_data::text FROM invoices WHERE id = ?::uuid", String.class, inv.getId().toString());
            if (rawData != null && !rawData.isEmpty() && !rawData.equals("null")) {
                String lower = rawData.toLowerCase();
                String stateCode = inv.getGstin().substring(0, 2);
                boolean isLocal = stateCode.equals("27");
                boolean hasCgstSgst = lower.contains("cgst") || lower.contains("sgst");
                boolean hasIgst = lower.contains("igst");

                if (isLocal && hasIgst) {
                    return true; // Local but has IGST
                }
                if (!isLocal && hasCgstSgst) {
                    return true; // Inter-state but has CGST/SGST
                }
            }
        } catch (Exception e) {
            log.warn("Failed to check tax type discrepancy for invoice {}: {}", inv.getId(), e.getMessage());
        }
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INNER TYPES
    // ─────────────────────────────────────────────────────────────────────────

    public enum MatchStrength {
        STRONG, POSSIBLE, NONE
    }

    public enum MatchMethod {
        EXACT, FUZZY_VECTOR
    }

    public enum MismatchType {
        NONE, NAME, AMOUNT, DATE, MISSING, GSTIN
    }

    @lombok.Data
    @lombok.Builder
    public static class InvoiceMatch {
        private UUID id;
        private String vendorName;
        private String gstin;
        private String invoiceNumber;
        private BigDecimal amount;
        private BigDecimal taxAmount;
        private LocalDate invoiceDate;
        private InvoiceSource source;
        private InvoiceStatus status;
        private double distance; // cosine distance (0 = identical)
        private double similarity; // 1 - distance (human-readable)
        private MatchStrength matchStrength;
    }

    @lombok.Data
    @lombok.Builder
    public static class ReconciliationResult {
        private UUID uploadedId;
        private UUID gstr2bId;
        private UUID mismatchId;
        private String outcome; // MATCHED | MISMATCHED | MISSING
        private MismatchType mismatchType;
        private BigDecimal amountDiff;
        private double riskScore;
        private MatchMethod matchMethod;

        static ReconciliationResult matched(UUID a, UUID b, MatchMethod m) {
            return ReconciliationResult.builder()
                    .uploadedId(a).gstr2bId(b)
                    .outcome("MATCHED").matchMethod(m).build();
        }

        static ReconciliationResult mismatched(UUID a, UUID b, MismatchType t,
                BigDecimal diff, double risk, UUID mmId) {
            return ReconciliationResult.builder()
                    .uploadedId(a).gstr2bId(b).mismatchId(mmId)
                    .outcome("MISMATCHED").mismatchType(t)
                    .amountDiff(diff).riskScore(risk).build();
        }

        static ReconciliationResult missing(UUID a, double risk, UUID mmId) {
            return ReconciliationResult.builder()
                    .uploadedId(a).mismatchId(mmId)
                    .outcome("MISSING").mismatchType(MismatchType.MISSING).riskScore(risk).build();
        }
    }
}
