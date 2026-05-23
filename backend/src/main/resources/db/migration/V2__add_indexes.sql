-- ═════════════════════════════════════════════════════════════════════════════
-- V2__add_indexes.sql
-- GST Invoice Reconciliation Platform — Performance Indexes
-- Author  : Database Architect
-- Flyway  : V2 (runs after V1__init_schema.sql)
--
-- Index Strategy:
--   B-Tree  → equality + range queries (dates, status, GSTIN lookups)
--   GIN     → JSONB containment queries (alias_names, features_json)
--   GIN/TRGM→ fuzzy text search on vendor names
--   HNSW    → approximate nearest-neighbour vector search (pgvector)
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- vendors indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Fast canonical_name fuzzy search (trigram) — used by AI name-matching pipeline
CREATE INDEX idx_vendors_canonical_name_trgm
    ON vendors USING GIN (canonical_name gin_trgm_ops);

-- Lookup by trust_score for risk triage dashboards
CREATE INDEX idx_vendors_trust_score
    ON vendors (trust_score DESC);

-- Filter active vendors only
CREATE INDEX idx_vendors_is_active
    ON vendors (is_active)
    WHERE is_active = TRUE;

-- GIN on alias_names JSONB for containment queries:
--   e.g. WHERE alias_names @> '["Acme Ltd"]'
CREATE INDEX idx_vendors_alias_names_gin
    ON vendors USING GIN (alias_names);

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Most common filter: status + source (e.g. all PENDING GSTR2B invoices)
CREATE INDEX idx_invoices_status_source
    ON invoices (status, source);

-- Date-range queries for monthly reconciliation runs
CREATE INDEX idx_invoices_invoice_date
    ON invoices (invoice_date DESC);

-- GSTIN lookup (exact match — B-tree on 15-char text)
CREATE INDEX idx_invoices_gstin
    ON invoices (gstin);

-- Vendor FK lookups
CREATE INDEX idx_invoices_vendor_id
    ON invoices (vendor_id)
    WHERE vendor_id IS NOT NULL;

-- Fuzzy vendor_name text search (trigram) — used when embedding is absent
CREATE INDEX idx_invoices_vendor_name_trgm
    ON invoices USING GIN (vendor_name gin_trgm_ops);

-- ── HNSW vector index on name_embedding ──────────────────────────────────────
-- HNSW (Hierarchical Navigable Small World) gives sub-linear ANN search.
-- Parameters:
--   m       = 16    (max connections per layer; higher → recall but more RAM)
--   ef_construction = 128 (build-time recall; higher → slower build, better index)
-- Tune m=32/ef=200 for larger datasets (>500k rows).
CREATE INDEX idx_invoices_name_embedding_hnsw
    ON invoices USING HNSW (name_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- Composite: status + invoice_date — common dashboard query
CREATE INDEX idx_invoices_status_date
    ON invoices (status, invoice_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- mismatches indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary triage query: all PENDING mismatches ordered by risk (highest first)
CREATE INDEX idx_mismatches_status_risk
    ON mismatches (status, risk_score DESC);

-- Lookup all mismatches for a given invoice
CREATE INDEX idx_mismatches_invoice_a
    ON mismatches (invoice_id_a);

CREATE INDEX idx_mismatches_invoice_b
    ON mismatches (invoice_id_b)
    WHERE invoice_id_b IS NOT NULL;

-- Filter by type (e.g. show all MISSING mismatches)
CREATE INDEX idx_mismatches_type
    ON mismatches (mismatch_type);

-- Time-based queries for SLA monitoring
CREATE INDEX idx_mismatches_created_at
    ON mismatches (created_at DESC);

-- Partial index: only PENDING mismatches — keeps index compact for hot path
CREATE INDEX idx_mismatches_pending
    ON mismatches (risk_score DESC, created_at)
    WHERE status = 'PENDING';

-- ─────────────────────────────────────────────────────────────────────────────
-- risk_scores indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Fetch all scores for a mismatch (e.g. history across model versions)
CREATE INDEX idx_risk_scores_mismatch_id
    ON risk_scores (mismatch_id, created_at DESC);

-- Filter by label (e.g. all HIGH-risk entries for batch processing)
CREATE INDEX idx_risk_scores_label
    ON risk_scores (label, score DESC);

-- GIN index on features_json for ad-hoc feature analysis queries
CREATE INDEX idx_risk_scores_features_gin
    ON risk_scores USING GIN (features_json);

-- ─────────────────────────────────────────────────────────────────────────────
-- agent_actions indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- All actions for a given mismatch
CREATE INDEX idx_agent_actions_mismatch_id
    ON agent_actions (mismatch_id, created_at DESC);

-- Filter by action status for the agent work queue
CREATE INDEX idx_agent_actions_status
    ON agent_actions (status)
    WHERE status = 'PENDING';

-- Filter by action type (e.g. all pending EMAIL_DRAFTs)
CREATE INDEX idx_agent_actions_type_status
    ON agent_actions (action_type, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- vector_store indexes (Spring AI managed table)
-- ─────────────────────────────────────────────────────────────────────────────

-- HNSW on the Spring AI vector_store embedding column
CREATE INDEX idx_vector_store_embedding_hnsw
    ON vector_store USING HNSW (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- GIN on metadata for metadata-filtered vector searches
CREATE INDEX idx_vector_store_metadata_gin
    ON vector_store USING GIN (metadata);

-- ─────────────────────────────────────────────────────────────────────────────
-- STATISTICS CONFIGURATION
-- Tell the query planner to use higher column statistics for high-cardinality
-- columns that appear frequently in WHERE clauses.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE invoices   ALTER COLUMN vendor_name     SET STATISTICS 500;
ALTER TABLE invoices   ALTER COLUMN gstin            SET STATISTICS 500;
ALTER TABLE mismatches ALTER COLUMN risk_score       SET STATISTICS 300;
ALTER TABLE vendors    ALTER COLUMN canonical_name   SET STATISTICS 500;
