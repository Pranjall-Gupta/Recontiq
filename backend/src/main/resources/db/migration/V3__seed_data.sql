-- ═════════════════════════════════════════════════════════════════════════════
-- V3__seed_data.sql
-- GST Invoice Reconciliation Platform — Development Seed Data
-- Author  : Database Architect
-- Flyway  : V3 (runs after V2__add_indexes.sql)
-- NOTE    : This migration is SAFE to run on dev/staging.
--           Do NOT run on production (gate behind spring.flyway.enabled=false
--           or use a separate flyway location for prod).
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: vendors
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO vendors (id, gstin, canonical_name, alias_names, trust_score, mismatch_history_count)
VALUES
    ('a1000000-0000-0000-0000-000000000001',
     '27AAPFU0939F1ZV', 'Infosys Limited',
     '["Infosys Ltd", "INFOSYS LTD.", "Infosys BPO"]',
     0.9800, 1),

    ('a1000000-0000-0000-0000-000000000002',
     '29AABCI1681N1ZG', 'Tata Consultancy Services Limited',
     '["TCS", "TCS Ltd", "Tata Consultancy"]',
     0.9500, 3),

    ('a1000000-0000-0000-0000-000000000003',
     '07AAGCR4423A1ZU', 'Reliance Industries Limited',
     '["Reliance Ind Ltd", "RIL", "Reliance Industries"]',
     0.9200, 5),

    ('a1000000-0000-0000-0000-000000000004',
     '19AABCG3614F1Z5', 'Wipro Technologies',
     '["Wipro Ltd", "WIPRO", "Wipro IT Services"]',
     0.7500, 12),

    ('a1000000-0000-0000-0000-000000000005',
     '06AAHCS5088R1ZY', 'HCL Technologies Limited',
     '["HCL Tech", "HCL Technologies", "HCL Ltd"]',
     0.8800, 2);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: invoices (UPLOADED — from user's books)
-- Embeddings left NULL; will be populated by the application's embedding pipeline
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO invoices (id, vendor_id, vendor_name, gstin, invoice_number, amount, tax_amount, invoice_date, source, status)
VALUES
    ('b2000000-0000-0000-0000-000000000001',
     'a1000000-0000-0000-0000-000000000001',
     'Infosys Limited', '27AAPFU0939F1ZV',
     'INF/2024/001', 500000.00, 90000.00, '2024-03-01', 'UPLOADED', 'PENDING'),

    ('b2000000-0000-0000-0000-000000000002',
     'a1000000-0000-0000-0000-000000000002',
     'TCS', '29AABCI1681N1ZG',
     'TCS/2024/0452', 1200000.00, 216000.00, '2024-03-05', 'UPLOADED', 'PENDING'),

    ('b2000000-0000-0000-0000-000000000003',
     'a1000000-0000-0000-0000-000000000003',
     'Reliance Ind Ltd', '07AAGCR4423A1ZU',
     'RIL-INV-24031', 350000.00, 63000.00, '2024-03-10', 'UPLOADED', 'PENDING'),

    ('b2000000-0000-0000-0000-000000000004',
     'a1000000-0000-0000-0000-000000000004',
     'Wipro Technologies', '19AABCG3614F1Z5',
     'WIP/24/1099', 780000.00, 140400.00, '2024-03-12', 'UPLOADED', 'PENDING'),

    ('b2000000-0000-0000-0000-000000000005',
     NULL,
     'Acme Global Pvt Ltd', '27AACCM5879K1ZM',
     'ACME/2024/7788', 95000.00, 17100.00, '2024-03-15', 'UPLOADED', 'PENDING');

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: invoices (GSTR2B — from government portal)
-- Amount mismatch on TCS invoice; Wipro and Acme are MISSING from GSTR2B
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO invoices (id, vendor_id, vendor_name, gstin, invoice_number, amount, tax_amount, invoice_date, source, status)
VALUES
    ('b2000000-0000-0000-0000-000000000011',
     'a1000000-0000-0000-0000-000000000001',
     'Infosys Limited', '27AAPFU0939F1ZV',
     'INF/2024/001', 500000.00, 90000.00, '2024-03-01', 'GSTR2B', 'MATCHED'),

    ('b2000000-0000-0000-0000-000000000012',
     'a1000000-0000-0000-0000-000000000002',
     'Tata Consultancy Services Limited', '29AABCI1681N1ZG',
     'TCS/2024/0452', 1180000.00, 212400.00, '2024-03-05', 'GSTR2B', 'MISMATCHED'),

    ('b2000000-0000-0000-0000-000000000013',
     'a1000000-0000-0000-0000-000000000003',
     'Reliance Industries Limited', '07AAGCR4423A1ZU',
     'RIL-INV-24031', 350000.00, 63000.00, '2024-03-10', 'GSTR2B', 'MATCHED');

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: mismatches
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO mismatches (id, invoice_id_a, invoice_id_b, mismatch_type, amount_diff, risk_score, status)
VALUES
    -- TCS: amount mismatch of ₹20,000
    ('c3000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000002',
     'b2000000-0000-0000-0000-000000000012',
     'AMOUNT', 20000.00, 0.6500, 'PENDING'),

    -- Wipro: missing from GSTR-2B entirely
    ('c3000000-0000-0000-0000-000000000002',
     'b2000000-0000-0000-0000-000000000004',
     NULL, 'MISSING', NULL, 0.8800, 'PENDING'),

    -- Acme: unknown vendor — missing from GSTR-2B, unresolved vendor
    ('c3000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000005',
     NULL, 'MISSING', NULL, 0.9200, 'ESCALATED');

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: risk_scores
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO risk_scores (id, mismatch_id, score, label, features_json, model_version)
VALUES
    ('d4000000-0000-0000-0000-000000000001',
     'c3000000-0000-0000-0000-000000000001',
     0.6500, 'MEDIUM',
     '{"amount_diff": 20000, "amount_diff_pct": 1.67, "vendor_trust": 0.95, "days_gap": 0, "history_count": 3}',
     'ollama/llama3.2:1b@2024-03'),

    ('d4000000-0000-0000-0000-000000000002',
     'c3000000-0000-0000-0000-000000000002',
     0.8800, 'HIGH',
     '{"amount_diff": 780000, "amount_diff_pct": 100, "vendor_trust": 0.75, "days_gap": 0, "history_count": 12}',
     'ollama/llama3.2:1b@2024-03'),

    ('d4000000-0000-0000-0000-000000000003',
     'c3000000-0000-0000-0000-000000000003',
     0.9200, 'CRITICAL',
     '{"amount_diff": 95000, "amount_diff_pct": 100, "vendor_trust": 0.0, "days_gap": 0, "history_count": 0, "unknown_vendor": true}',
     'ollama/llama3.2:1b@2024-03');

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: agent_actions
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO agent_actions (id, mismatch_id, action_type, content, status, model_version)
VALUES
    ('e5000000-0000-0000-0000-000000000001',
     'c3000000-0000-0000-0000-000000000001',
     'EMAIL_DRAFT',
     'Dear Accounts Team at TCS,\n\nWe have identified a discrepancy of ₹20,000 between our books (Invoice TCS/2024/0452 — ₹12,00,000) and the amount reflected in GSTR-2B (₹11,80,000). Kindly review and issue a revised invoice or credit note at the earliest.\n\nRegards,\nGST Reconciliation Team',
     'PENDING',
     'ollama/llama3.2:1b@2024-03'),

    ('e5000000-0000-0000-0000-000000000002',
     'c3000000-0000-0000-0000-000000000002',
     'ESCALATE',
     'ESCALATION: Invoice WIP/24/1099 from Wipro Technologies (₹7,80,000) is completely absent from GSTR-2B for March 2024. Vendor trust score is 0.75 with 12 prior mismatches. Recommend immediate follow-up with vendor and manual verification before ITC claim.',
     'PENDING',
     'ollama/llama3.2:1b@2024-03'),

    ('e5000000-0000-0000-0000-000000000003',
     'c3000000-0000-0000-0000-000000000003',
     'ESCALATE',
     'CRITICAL ESCALATION: Invoice ACME/2024/7788 from unregistered/unknown vendor "Acme Global Pvt Ltd" (GSTIN: 27AACCM5879K1ZM) has no GSTR-2B match. GSTIN could not be resolved in the vendor registry. Risk score: 0.92 (CRITICAL). Do NOT claim ITC until GSTIN verification is complete via GST Portal.',
     'SENT',
     'ollama/llama3.2:1b@2024-03');
