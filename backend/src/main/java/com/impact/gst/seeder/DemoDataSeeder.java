package com.impact.gst.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * DemoDataSeeder
 * ──────────────────────────────────────────────────────────────────────────────
 * Populates the GST reconciliation database with ~200 realistic Indian invoices
 * that exercise every reconciliation scenario:
 *
 *  [A] 150  clean matched pairs        (UPLOADED ↔ GSTR2B, all match perfectly)
 *  [B]  20  name-mismatch pairs        ("Tata Sons Pvt Ltd" ↔ "Tata Sons Private Limited")
 *  [C]  15  amount-mismatch pairs      (₹1–500 rounding difference)
 *  [D]  10  missing-from-GSTR2B       (UPLOADED only — ITC risk)
 *  [E]   5  shared-GSTIN fraud        (3 companies, 1 GSTIN — fraud demo)
 *
 * Activated ONLY on the "dev" Spring profile.  Safe to re-run — uses
 * ON CONFLICT DO NOTHING so repeated executions are idempotent.
 *
 * Usage:  spring.profiles.active=dev
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    // ── Counter for INV-2024-XXXX sequential numbering ───────────────────────
    private final AtomicInteger invoiceSeq = new AtomicInteger(1000);
    private final Random rng = new Random(42); // fixed seed → reproducible data

    // ═════════════════════════════════════════════════════════════════════════
    // MASTER COMPANY DATA
    // Format: { displayName, gstin, canonicalName, stateCode }
    // GSTINs follow the real 15-char pattern:
    //   [2-digit state][5 alpha PAN part 1][4 digit PAN part 2][1 alpha PAN tail][entity Z check]
    // ═════════════════════════════════════════════════════════════════════════
    private static final String[][] COMPANIES = {
        // Maharashtra (27)
        {"Mehta Traders Pvt Ltd",        "27AABMT1332L1ZV", "Mehta Traders Pvt Ltd",        "27"},
        {"Shah Industries",               "27AABSH5678B1ZK", "Shah Industries",               "27"},
        {"Bajaj Auto Limited",            "27AAACB4717K1ZU", "Bajaj Auto Limited",            "27"},
        {"Godrej Industries Ltd",         "27AAACG4234M1ZV", "Godrej Industries Ltd",         "27"},
        {"Larsen & Toubro Limited",       "27AAACL0764L1ZW", "Larsen & Toubro Limited",       "27"},
        {"Mahindra and Mahindra Ltd",     "27AAAMC5371F1ZX", "Mahindra and Mahindra Ltd",     "27"},
        {"Piramal Enterprises Ltd",       "27AABCP3892N1ZY", "Piramal Enterprises Ltd",       "27"},
        {"Finolex Cables Ltd",            "27AABCF2781K1ZZ", "Finolex Cables Ltd",            "27"},
        {"Bharat Forge Limited",          "27AABCB1234J1Z0", "Bharat Forge Limited",          "27"},
        {"Wockhardt Limited",             "27AABCW9012M1Z1", "Wockhardt Limited",             "27"},

        // Gujarat (24)
        {"Reliance Fab Gujarat",          "24AABRF9012C1ZP", "Reliance Fab Gujarat",          "24"},
        {"Sun Pharmaceutical Ind",        "24AAACS4462M1ZQ", "Sun Pharmaceutical Industries", "24"},
        {"Adani Enterprises Limited",     "24AAACA1232A1ZR", "Adani Enterprises Limited",     "24"},
        {"Torrent Power Limited",         "24AABCT1445P1ZS", "Torrent Power Limited",         "24"},
        {"Zydus Lifesciences Ltd",        "24AABCZ8765Q1ZT", "Zydus Lifesciences Ltd",        "24"},
        {"Amul Dairy Gujarat Co-op",      "24AABCA4321R1ZU", "Amul Dairy Gujarat Co-op",      "24"},
        {"Vadilal Industries Ltd",        "24AABCV5432S1ZV", "Vadilal Industries Ltd",        "24"},
        {"Sintex Industries Ltd",         "24AABCS6543T1ZW", "Sintex Industries Ltd",         "24"},

        // Karnataka (29)
        {"Infosys Limited",               "29AAACI1681N1ZG", "Infosys Limited",               "29"},
        {"Wipro Limited",                 "29AAACW4977K1ZH", "Wipro Limited",                 "29"},
        {"Biocon Limited",                "29AABCB7890U1ZI", "Biocon Limited",                "29"},
        {"Mphasis Limited",               "29AABCM8901V1ZJ", "Mphasis Limited",               "29"},
        {"Mindtree Limited",              "29AABCM9012W1ZK", "Mindtree Limited",              "29"},

        // Delhi (07)
        {"Bharti Airtel Limited",         "07AABCB5076E1ZL", "Bharti Airtel Limited",         "07"},
        {"DLF Limited",                   "07AAACД1234X1ZM", "DLF Limited",                   "07"},
        {"Delhi Cloth & General Mills",   "07AABCD2345Y1ZN", "Delhi Cloth & General Mills",   "07"},
        {"Dabur India Limited",           "07AAACI5869H1ZO", "Dabur India Limited",           "07"},

        // Tamil Nadu (33)
        {"TVS Motor Company Ltd",         "33AABCT4567Z1ZP", "TVS Motor Company Ltd",         "33"},
        {"MRF Limited",                   "33AAACM8765A1ZQ", "MRF Limited",                   "33"},
        {"Ashok Leyland Limited",         "33AAACA0987B1ZR", "Ashok Leyland Limited",         "33"},
        {"CG Power & Industrial Sol",     "33AABCC1098C1ZS", "CG Power & Industrial Sol",     "33"},

        // Telangana (36)
        {"Dr Reddys Laboratories",        "36AAACR0510N1ZT", "Dr Reddys Laboratories Ltd",    "36"},
        {"Aurobindo Pharma Limited",      "36AAACA8901D1ZU", "Aurobindo Pharma Limited",      "36"},
        {"Granules India Limited",        "36AABCG3456E1ZV", "Granules India Limited",        "36"},

        // Rajasthan (08)
        {"Birla Corporation Limited",     "08AABCB2345F1ZW", "Birla Corporation Limited",     "08"},
        {"Rajasthan Textiles Ltd",        "08AABCR4567G1ZX", "Rajasthan Textiles Ltd",        "08"},
        {"JK Lakshmi Cement Ltd",         "08AAACJ1234H1ZY", "JK Lakshmi Cement Ltd",        "08"},

        // Uttar Pradesh (09)
        {"Dalmia Bharat Ltd",             "09AACD1234I1ZZ", "Dalmia Bharat Ltd",             "09"},
        {"Kanpur Fertilizers & Chem",     "09AABCK5678J1Z0", "Kanpur Fertilizers & Chem",    "09"},

        // West Bengal (19)
        {"ITC Limited",                   "19AAACI5950N1Z1", "ITC Limited",                   "19"},
        {"Haldia Petrochemicals Ltd",     "19AABCH6789K1Z2", "Haldia Petrochemicals Ltd",     "19"},
    };

    private static final int[]    TAX_RATES     = {5, 12, 18, 28};

    // ─── Name-mismatch pairs: uploaded name → gstr2b canonical name ──────────
    private static final String[][] NAME_MISMATCH_PAIRS = {
        {"Tata Sons Pvt Ltd",             "Tata Sons Private Limited",              "27AABCT1332L1ZV"},
        {"Infosys Ltd",                   "Infosys Limited",                        "29AAACI1681N1ZG"},
        {"Wipro Ltd",                     "Wipro Limited",                          "29AAACW4977K1ZH"},
        {"Bajaj Auto Ltd",                "Bajaj Auto Limited",                     "27AAACB4717K1ZU"},
        {"Reliance Industries Ltd",       "Reliance Industries Limited",            "27AAACR1234L1Z9"},
        {"Mahindra Mahindra Ltd",         "Mahindra and Mahindra Ltd",              "27AAAMC5371F1ZX"},
        {"Sun Pharma Ltd",                "Sun Pharmaceutical Industries",          "24AAACS4462M1ZQ"},
        {"HCL Technologies Ltd",          "HCL Technologies Limited",               "09AAACH7569P1ZA"},
        {"L and T Limited",               "Larsen & Toubro Limited",                "27AAACL0764L1ZW"},
        {"Dr Reddys Lab",                 "Dr Reddys Laboratories Ltd",             "36AAACR0510N1ZT"},
    };

    // ─── Fraud demo: 5 invoices, 3 different company names, 1 shared GSTIN ──
    private static final String   FRAUD_GSTIN   = "27AAAFR9999X1ZZ";
    private static final String[] FRAUD_VENDORS = {
        "Rapid Trading Co",
        "Swift Commerce Pvt Ltd",
        "Fast Deal Enterprises",
    };

    // ==========================================================================
    //  ENTRY POINT
    // ==========================================================================

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (isAlreadySeeded()) {
            log.info("DemoDataSeeder — data already present, skipping.");
            return;
        }
        log.info("════════════════════════════════════════════");
        log.info("  DemoDataSeeder — Seeding demo data...");
        log.info("════════════════════════════════════════════");

        seedVendors();
        List<InvoicePair> matched     = seedCleanInvoices(150);
        List<MismatchRecord> nameMM   = seedNameMismatches();
        List<MismatchRecord> amountMM = seedAmountMismatches();
        List<UUID> missingUploads     = seedMissingFromGSTR2B();
        List<UUID> fraudInvoices      = seedFraudInvoices();

        seedMismatchRecords(nameMM, amountMM, missingUploads, fraudInvoices);

        log.info("  ✓ Vendors        : {}", COMPANIES.length + 3 /*fraud*/);
        log.info("  ✓ Clean pairs    : {}", matched.size());
        log.info("  ✓ Name mm-pairs  : {}", nameMM.size());
        log.info("  ✓ Amount mm-pairs: {}", amountMM.size());
        log.info("  ✓ Missing invoices: {}", missingUploads.size());
        log.info("  ✓ Fraud invoices : {}", fraudInvoices.size());
        log.info("════════════════════════════════════════════");
    }

    // ==========================================================================
    //  SECTION A — SEED VENDORS
    // ==========================================================================

    private void seedVendors() {
        String sql = """
            INSERT INTO vendors (id, gstin, canonical_name, alias_names, trust_score, mismatch_history_count)
            VALUES (uuid_generate_v4(), ?, ?, ?::jsonb, ?, ?)
            ON CONFLICT (gstin) DO NOTHING
            """;

        List<Object[]> rows = new ArrayList<>();

        for (String[] c : COMPANIES) {
            rows.add(new Object[]{
                c[1],           // gstin
                c[2],           // canonical_name
                "[]",           // alias_names (empty initially)
                new BigDecimal("0.9500"),
                0
            });
        }

        // Fraud vendors with shared GSTIN — insert as single vendor (first one wins)
        rows.add(new Object[]{
            FRAUD_GSTIN, "Rapid Trading Co (Flagged)",
            "[\"Rapid Trading Co\",\"Swift Commerce Pvt Ltd\",\"Fast Deal Enterprises\"]",
            new BigDecimal("0.1000"), 5
        });

        // Name-mismatch vendors (Tata Sons + extra that don't already exist)
        rows.add(new Object[]{"27AABCT1332L1ZV", "Tata Sons Private Limited",
            "[\"Tata Sons Pvt Ltd\",\"Tata Sons Ltd\"]", new BigDecimal("0.9200"), 2});
        rows.add(new Object[]{"09AAACH7569P1ZA", "HCL Technologies Limited",
            "[\"HCL Technologies Ltd\",\"HCL Tech\"]", new BigDecimal("0.9400"), 1});
        rows.add(new Object[]{"27AAACR1234L1Z9", "Reliance Industries Limited",
            "[\"Reliance Industries Ltd\",\"RIL\"]", new BigDecimal("0.9600"), 0});

        jdbc.batchUpdate(sql, rows);
    }

    // ==========================================================================
    //  SECTION B — CLEAN MATCHED INVOICES (150 pairs)
    // ==========================================================================

    private List<InvoicePair> seedCleanInvoices(int count) {
        List<InvoicePair> pairs = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String[]       co      = COMPANIES[rng.nextInt(COMPANIES.length)];
            String         invNo   = nextInvoiceNumber();
            BigDecimal     amount  = randomAmount();
            BigDecimal     tax     = taxFor(amount);
            LocalDate      date    = randomDate();

            UUID uploadId = insertInvoice(co[0], co[1], invNo, amount, tax, date, "UPLOADED",  "MATCHED");
            UUID gstr2bId = insertInvoice(co[2], co[1], invNo, amount, tax, date, "GSTR2B",    "MATCHED");
            pairs.add(new InvoicePair(uploadId, gstr2bId));
        }
        return pairs;
    }

    // ==========================================================================
    //  SECTION C — NAME MISMATCHES (20 invoices = 10 pairs)
    // ==========================================================================

    private List<MismatchRecord> seedNameMismatches() {
        List<MismatchRecord> records = new ArrayList<>();

        for (String[] pair : NAME_MISMATCH_PAIRS) {
            String     uploadName  = pair[0];
            String     gstr2bName  = pair[1];
            String     gstin       = pair[2];
            String     invNo       = nextInvoiceNumber();
            BigDecimal amount      = randomAmount();
            BigDecimal tax         = taxFor(amount);
            LocalDate  date        = randomDate();

            // Same invoice, same amount — only name differs
            UUID uploadId = insertInvoice(uploadName, gstin, invNo, amount, tax, date,  "UPLOADED",  "MISMATCHED");
            UUID gstr2bId = insertInvoice(gstr2bName, gstin, invNo, amount, tax, date,  "GSTR2B",    "MISMATCHED");
            records.add(new MismatchRecord(uploadId, gstr2bId, "NAME", BigDecimal.ZERO, riskScoreForName()));
        }

        // Generate 10 more pairs by cycling through pairs with slight variation
        for (int i = 0; i < 10; i++) {
            String[]   pair       = NAME_MISMATCH_PAIRS[i % NAME_MISMATCH_PAIRS.length];
            String     invNo      = nextInvoiceNumber();
            BigDecimal amount     = randomAmount();
            BigDecimal tax        = taxFor(amount);
            LocalDate  date       = randomDate();

            UUID uploadId = insertInvoice(pair[0], pair[2], invNo, amount, tax, date, "UPLOADED",  "MISMATCHED");
            UUID gstr2bId = insertInvoice(pair[1], pair[2], invNo, amount, tax, date, "GSTR2B",    "MISMATCHED");
            records.add(new MismatchRecord(uploadId, gstr2bId, "NAME", BigDecimal.ZERO, riskScoreForName()));
        }
        return records;
    }

    // ==========================================================================
    //  SECTION D — AMOUNT MISMATCHES (15 pairs, ₹1–500 difference)
    // ==========================================================================

    private List<MismatchRecord> seedAmountMismatches() {
        List<MismatchRecord> records = new ArrayList<>();
        for (int i = 0; i < 15; i++) {
            String[]   co          = COMPANIES[rng.nextInt(COMPANIES.length)];
            String     invNo       = nextInvoiceNumber();
            BigDecimal baseAmount  = randomAmount();
            BigDecimal baseTax     = taxFor(baseAmount);
            LocalDate  date        = randomDate();

            // Rounding error: ₹1.00 – ₹500.00 difference
            BigDecimal diff        = BigDecimal.valueOf(1 + rng.nextInt(500))
                                               .setScale(2, RoundingMode.HALF_UP);
            BigDecimal gstr2bAmt   = baseAmount.subtract(diff);   // GSTR2B shows lower amount
            BigDecimal gstr2bTax   = taxFor(gstr2bAmt);

            UUID uploadId = insertInvoice(co[0], co[1], invNo, baseAmount, baseTax, date, "UPLOADED",  "MISMATCHED");
            UUID gstr2bId = insertInvoice(co[2], co[1], invNo, gstr2bAmt,  gstr2bTax, date, "GSTR2B",  "MISMATCHED");
            records.add(new MismatchRecord(uploadId, gstr2bId, "AMOUNT", diff, riskScoreForAmount(diff)));
        }
        return records;
    }

    // ==========================================================================
    //  SECTION E — MISSING FROM GSTR2B (10 invoices — ITC risk)
    // ==========================================================================

    private List<UUID> seedMissingFromGSTR2B() {
        List<UUID> ids = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            String[]   co     = COMPANIES[rng.nextInt(COMPANIES.length)];
            String     invNo  = nextInvoiceNumber();
            BigDecimal amount = randomAmount();
            BigDecimal tax    = taxFor(amount);
            LocalDate  date   = randomDate();

            UUID uploadId = insertInvoice(co[0], co[1], invNo, amount, tax, date, "UPLOADED", "MISMATCHED");
            ids.add(uploadId);
        }
        return ids;
    }

    // ==========================================================================
    //  SECTION F — FRAUD: 5 invoices from 3 vendors sharing 1 GSTIN
    // ==========================================================================

    private List<UUID> seedFraudInvoices() {
        List<UUID> ids = new ArrayList<>();
        // 5 invoices spread across 3 vendor names, all with the same GSTIN
        int[] distribution = {2, 2, 1}; // vendor[0]=2, vendor[1]=2, vendor[2]=1
        for (int v = 0; v < FRAUD_VENDORS.length; v++) {
            for (int i = 0; i < distribution[v]; i++) {
                String     invNo  = nextInvoiceNumber();
                BigDecimal amount = randomAmount();
                BigDecimal tax    = taxFor(amount);
                LocalDate  date   = randomDate();

                UUID uploadId = insertInvoice(FRAUD_VENDORS[v], FRAUD_GSTIN,
                        invNo, amount, tax, date, "UPLOADED", "MISMATCHED");
                ids.add(uploadId);
            }
        }
        return ids;
    }

    // ==========================================================================
    //  SECTION G — MISMATCH RECORDS
    // ==========================================================================

    private void seedMismatchRecords(
            List<MismatchRecord> nameMM,
            List<MismatchRecord> amountMM,
            List<UUID>           missing,
            List<UUID>           fraud) {

        String sql = """
            INSERT INTO mismatches
                (id, invoice_id_a, invoice_id_b, mismatch_type, amount_diff, risk_score, status)
            VALUES (uuid_generate_v4(), ?, ?, ?::mismatch_type, ?, ?, 'PENDING'::mismatch_status)
            ON CONFLICT DO NOTHING
            """;

        List<Object[]> rows = new ArrayList<>();

        for (MismatchRecord m : nameMM) {
            rows.add(new Object[]{m.uploadId().toString(), m.gstr2bId().toString(),
                    m.type(), m.diff(), m.riskScore()});
        }
        for (MismatchRecord m : amountMM) {
            rows.add(new Object[]{m.uploadId().toString(), m.gstr2bId().toString(),
                    m.type(), m.diff(), m.riskScore()});
        }
        for (UUID id : missing) {
            rows.add(new Object[]{id.toString(), null, "MISSING", null,
                    new BigDecimal("0.8500")});
        }
        for (UUID id : fraud) {
            rows.add(new Object[]{id.toString(), null, "GSTIN", null,
                    new BigDecimal("0.9500")});
        }

        jdbc.batchUpdate(sql, rows);
    }

    // ==========================================================================
    //  HELPER METHODS
    // ==========================================================================

    /**
     * Core invoice insert — returns the generated UUID for linking.
     */
    private UUID insertInvoice(String vendorName, String gstin,
                                String invNo, BigDecimal amount, BigDecimal tax,
                                LocalDate date, String source, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO invoices
                (id, vendor_name, gstin, invoice_number, amount, tax_amount,
                 invoice_date, source, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?::invoice_source, ?::invoice_status)
            ON CONFLICT (invoice_number, gstin, source) DO NOTHING
            """,
            id, vendorName, gstin, invNo, amount, tax,
            java.sql.Date.valueOf(date), source, status);
        return id;
    }

    /** Checks if invoices table already has data to make the seeder idempotent. */
    private boolean isAlreadySeeded() {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM invoices", Integer.class);
        return count != null && count > 0;
    }

    /** Produces the next sequential invoice number: INV-2024-XXXX */
    private String nextInvoiceNumber() {
        return "INV-2024-" + invoiceSeq.getAndIncrement();
    }

    /**
     * Random amount between ₹5,000 and ₹50,00,000.
     * Uses a weighted distribution: 70% small (₹5k–₹5L), 30% large (₹5L–₹50L)
     */
    private BigDecimal randomAmount() {
        double raw = (rng.nextDouble() < 0.70)
            ? 5_000  + rng.nextInt(495_000)      // ₹5k   – ₹5L
            : 500_000 + rng.nextInt(4_500_000);   // ₹5L   – ₹50L
        return BigDecimal.valueOf(raw).setScale(2, RoundingMode.HALF_UP);
    }

    /** Computes GST at one of the four standard slabs. */
    private BigDecimal taxFor(BigDecimal amount) {
        int rate = TAX_RATES[rng.nextInt(TAX_RATES.length)];
        return amount.multiply(BigDecimal.valueOf(rate))
                     .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /** Random date within FY 2024-25 (Apr 2024 – Mar 2025). */
    private LocalDate randomDate() {
        LocalDate start = LocalDate.of(2024, 4, 1);
        return start.plusDays(rng.nextInt(365));
    }

    /** Risk score for a name mismatch (0.40–0.75 range — medium). */
    private BigDecimal riskScoreForName() {
        double score = 0.40 + rng.nextDouble() * 0.35;
        return BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * Risk score for amount mismatch.
     * ₹0–₹100  → low   (0.1–0.4)
     * ₹100–₹500 → medium (0.4–0.7)
     */
    private BigDecimal riskScoreForAmount(BigDecimal diff) {
        double d = diff.doubleValue();
        double score = (d <= 100) ? 0.10 + rng.nextDouble() * 0.30
                                  : 0.40 + rng.nextDouble() * 0.30;
        return BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP);
    }

    // ==========================================================================
    //  RECORDS (Java 16+ lightweight data carriers)
    // ==========================================================================

    record InvoicePair(UUID uploadId, UUID gstr2bId) {}

    record MismatchRecord(
        UUID       uploadId,
        UUID       gstr2bId,   // null for MISSING/GSTIN types
        String     type,
        BigDecimal diff,
        BigDecimal riskScore
    ) {}
}
