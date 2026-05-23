package com.impact.gst.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * VendorNormalizationService
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalises raw Indian company name variants into a clean, canonical form
 * for accurate reconciliation and vendor deduplication.
 *
 * <h3>Normalisation rules (applied in order):</h3>
 * <ol>
 * <li>Trim leading/trailing whitespace</li>
 * <li>Collapse multiple internal spaces to a single space</li>
 * <li>Strip legal suffixes (Pvt Ltd, Private Limited, LLP, etc.)</li>
 * <li>Strip common generic prefixes (M/s., Messrs., The)</li>
 * <li>Standardise casing → UPPER_CASE for consistent comparison</li>
 * <li>Remove punctuation (dots, commas, parentheses, &amp; vs and)</li>
 * </ol>
 *
 * <h3>Example mappings</h3>
 * 
 * <pre>
 *  "Tata Sons Pvt Ltd"       → "TATA SONS"
 *  "Tata Sons Private Limited"→ "TATA SONS"
 *  "M/s. Shah Industries"    → "SHAH INDUSTRIES"
 *  "L & T Limited"           → "L AND T"
 *  "Larsen &amp; Toubro Ltd."    → "LARSEN AND TOUBRO"
 *  "HCL Technologies  Ltd."  → "HCL TECHNOLOGIES"
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VendorNormalizationService {

    private final JdbcTemplate jdbc;

    // ─────────────────────────────────────────────────────────────────────────
    // SUFFIX / PREFIX PATTERNS (compiled once, reused)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Legal suffixes — case-insensitive, must appear at end after optional
     * spaces/dots
     */
    private static final Pattern SUFFIX_PATTERN = Pattern.compile(
            "(?i)\\s*[,.]?\\s*(" +
                    "private limited" +
                    "|pvt\\.?\\s*ltd\\.?" +
                    "|pvt\\.?" +
                    "|limited" +
                    "|ltd\\.?" +
                    "|llp" +
                    "|llc" +
                    "|inc\\.?" +
                    "|corp\\.?" +
                    "|corporation" +
                    "|co\\.?\\s*ltd\\.?" +
                    "|co\\.?" +
                    "|and\\s+co\\.?" +
                    "|& co\\.?" +
                    "|industries" + // standalone suffix e.g. "Shah Industries"
                    "|enterprises" +
                    "|solutions" +
                    "|services" +
                    "|associates" +
                    "|trading" +
                    "|traders" +
                    ")\\s*$",
            Pattern.CASE_INSENSITIVE);

    /** Prefixes to strip at the start of the name */
    private static final Pattern PREFIX_PATTERN = Pattern.compile(
            "(?i)^\\s*(m/s\\.?\\s*|messrs\\.?\\s*|the\\s+)",
            Pattern.CASE_INSENSITIVE);

    /** Ampersand → "and" for uniform comparison */
    private static final Pattern AMPERSAND_PATTERN = Pattern.compile("\\s*&\\s*");

    /** Remove trailing / leading punctuation artefacts */
    private static final Pattern PUNCTUATION_PATTERN = Pattern.compile("[.,;:()\\[\\]'\"]");

    /** Collapse multiple whitespace to a single space */
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s{2,}");

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalise a raw vendor name to its canonical comparison form.
     *
     * @param rawName raw vendor name as it appears on the invoice
     * @return normalised UPPER_CASE name without legal suffixes/prefixes
     */
    public String normalize(String rawName) {
        if (rawName == null || rawName.isBlank())
            return "";

        String result = rawName;

        // 1. Trim
        result = result.trim();

        // 2. Strip M/s., Messrs., The
        result = PREFIX_PATTERN.matcher(result).replaceAll("");

        // 3. Replace & with "and"
        result = AMPERSAND_PATTERN.matcher(result).replaceAll(" AND ");

        // 4. Remove stray punctuation
        result = PUNCTUATION_PATTERN.matcher(result).replaceAll(" ");

        // 5. Collapse repeated spaces
        result = WHITESPACE_PATTERN.matcher(result).replaceAll(" ").trim();

        // 6. Uppercase before suffix removal (regex is case-insensitive regardless)
        result = result.toUpperCase(Locale.ENGLISH);

        // 7. Strip legal suffixes (loop: "Pvt Ltd" → "Pvt" → needs two passes
        // sometimes)
        String prev;
        do {
            prev = result;
            result = SUFFIX_PATTERN.matcher(result).replaceAll("").trim();
        } while (!result.equals(prev));

        // 8. Final collapse
        result = WHITESPACE_PATTERN.matcher(result).replaceAll(" ").trim();

        log.trace("normalize('{}') → '{}'", rawName, result);
        return result;
    }

    /**
     * Return the similarity ratio between two normalised names (0.0–1.0).
     * Uses character-level Jaro-Winkler for short strings and token-overlap
     * for longer ones.
     *
     * @return similarity score in [0.0, 1.0]
     */
    public double similarityScore(String nameA, String nameB) {
        String a = normalize(nameA);
        String b = normalize(nameB);
        if (a.equals(b))
            return 1.0;
        if (a.isEmpty() || b.isEmpty())
            return 0.0;

        return jaroWinkler(a, b);
    }

    /**
     * Determine the canonical company name for a given GSTIN by finding the
     * most-frequently occurring normalised vendor name across all invoices for
     * that GSTIN, and updating the vendor record.
     *
     * <p>
     * This is typically called after a batch import or vendor merge operation.
     *
     * @param gstin 15-char GSTIN to process
     * @return the canonical name that was set (or empty if GSTIN not found)
     */
    @Transactional
    public String updateCanonicalName(String gstin) {
        // Step 1: Fetch all vendor_name values for this GSTIN
        List<String> rawNames = jdbc.queryForList(
                "SELECT DISTINCT vendor_name FROM invoices WHERE gstin = ? AND vendor_name IS NOT NULL",
                String.class, gstin);

        if (rawNames.isEmpty()) {
            log.warn("updateCanonicalName: no invoices found for GSTIN={}", gstin);
            return "";
        }

        // Step 2: Normalise each name and find the most common normalised form
        Map<String, Long> frequencyMap = rawNames.stream()
                .collect(Collectors.groupingBy(this::normalize, Collectors.counting()));

        String topNormalised = frequencyMap.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("");

        if (topNormalised.isEmpty()) {
            log.warn("updateCanonicalName: could not determine canonical name for GSTIN={}", gstin);
            return "";
        }

        // Step 3: From all raw names matching the top-normalised form, pick the
        // longest as the most "complete" canonical spelling
        String canonical = rawNames.stream()
                .filter(n -> normalize(n).equals(topNormalised))
                .max(Comparator.comparingInt(String::length))
                .orElse(topNormalised);

        // Step 4: Build alias_names JSON array from all distinct normalised variants
        String aliasJson = buildAliasJson(rawNames);

        // Step 5: Upsert the vendor record
        int updated = jdbc.update(
                """
                        UPDATE vendors
                           SET canonical_name = ?,
                               alias_names    = ?::jsonb,
                               updated_at     = NOW()
                         WHERE gstin = ?
                        """,
                canonical, aliasJson, gstin);

        if (updated == 0) {
            // vendor row doesn't exist yet — insert it
            jdbc.update(
                    """
                            INSERT INTO vendors (id, gstin, canonical_name, alias_names, trust_score, mismatch_history_count)
                            VALUES (uuid_generate_v4(), ?, ?, ?::jsonb, 1.0000, 0)
                            ON CONFLICT (gstin) DO UPDATE
                                SET canonical_name = EXCLUDED.canonical_name,
                                    alias_names    = EXCLUDED.alias_names
                            """,
                    gstin, canonical, aliasJson);
        }

        log.info("updateCanonicalName: GSTIN={} → '{}' (variants: {})",
                gstin, canonical, frequencyMap.keySet());
        return canonical;
    }

    /**
     * Batch-update canonical names for all GSTINs that have more than one
     * distinct vendor name variant across invoices.
     *
     * @return number of GSTINs processed
     */
    @Transactional
    public int updateAllCanonicalNames() {
        List<String> gstinsWithVariants = jdbc.queryForList(
                """
                        SELECT gstin
                          FROM invoices
                         WHERE vendor_name IS NOT NULL
                         GROUP BY gstin
                        HAVING COUNT(DISTINCT vendor_name) > 1
                        """,
                String.class);

        log.info("updateAllCanonicalNames: processing {} GSTINs with name variants", gstinsWithVariants.size());
        for (String gstin : gstinsWithVariants) {
            try {
                updateCanonicalName(gstin);
            } catch (Exception ex) {
                log.error("Failed to update canonical name for GSTIN={}: {}", gstin, ex.getMessage());
            }
        }
        return gstinsWithVariants.size();
    }

    /**
     * Check whether two raw vendor names refer to the same entity.
     * Uses normalisation + similarity threshold before involving embeddings.
     *
     * @param nameA first raw vendor name
     * @param nameB second raw vendor name
     * @return true if the names are likely the same entity
     */
    public boolean areLikelySameVendor(String nameA, String nameB) {
        String a = normalize(nameA);
        String b = normalize(nameB);

        if (a.equals(b))
            return true; // identical after normalisation
        if (a.isEmpty() || b.isEmpty())
            return false;

        // Token overlap: both must share ≥ 60% of their tokens
        Set<String> tokensA = Set.of(a.split("\\s+"));
        Set<String> tokensB = Set.of(b.split("\\s+"));
        long shared = tokensA.stream().filter(tokensB::contains).count();
        double overlapA = (double) shared / tokensA.size();
        double overlapB = (double) shared / tokensB.size();

        if (overlapA >= 0.6 && overlapB >= 0.6)
            return true;

        // Jaro-Winkler fallback for short names / abbreviations
        return jaroWinkler(a, b) >= 0.88;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String buildAliasJson(List<String> rawNames) {
        String escaped = rawNames.stream()
                .distinct()
                .map(n -> "\"" + n.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(","));
        return "[" + escaped + "]";
    }

    // ─── Jaro-Winkler similarity (pure Java, no external deps) ───────────────

    private double jaroWinkler(String s, String t) {
        double jaro = jaro(s, t);
        int prefix = 0;
        int maxLen = Math.min(4, Math.min(s.length(), t.length()));
        for (int i = 0; i < maxLen; i++) {
            if (s.charAt(i) == t.charAt(i))
                prefix++;
            else
                break;
        }
        return jaro + prefix * 0.1 * (1.0 - jaro);
    }

    private double jaro(String s, String t) {
        if (s.equals(t))
            return 1.0;
        int sl = s.length(), tl = t.length();
        int matchDist = Math.max(sl, tl) / 2 - 1;
        if (matchDist < 0)
            matchDist = 0;

        boolean[] sMatch = new boolean[sl];
        boolean[] tMatch = new boolean[tl];
        int matches = 0, transpositions = 0;

        for (int i = 0; i < sl; i++) {
            int start = Math.max(0, i - matchDist);
            int end = Math.min(i + matchDist + 1, tl);
            for (int j = start; j < end; j++) {
                if (tMatch[j] || s.charAt(i) != t.charAt(j))
                    continue;
                sMatch[i] = tMatch[j] = true;
                matches++;
                break;
            }
        }
        if (matches == 0)
            return 0.0;

        int k = 0;
        for (int i = 0; i < sl; i++) {
            if (!sMatch[i])
                continue;
            while (!tMatch[k])
                k++;
            if (s.charAt(i) != t.charAt(k))
                transpositions++;
            k++;
        }

        return (matches / (double) sl +
                matches / (double) tl +
                (matches - transpositions / 2.0) / matches) / 3.0;
    }
}
