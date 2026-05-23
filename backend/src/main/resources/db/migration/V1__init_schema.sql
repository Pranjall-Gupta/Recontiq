-- ═════════════════════════════════════════════════════════════════════════════
-- V1__init_schema.sql
-- GST Invoice Reconciliation Platform — Initial Database Schema
-- Author  : Database Architect
-- Flyway  : V1
-- Requires: pgvector, uuid-ossp, pg_trgm extensions (see infra/postgres/init.sql)
--
-- DIMENSION NOTE:
--   name_embedding is vector(384) — compatible with:
--     • all-minilm:l6-v2  (Ollama, 384-dim, fast)
--     • nomic-embed-text  produces 768-dim; change vector(384) → vector(768)
--       and update spring.ai.vectorstore.pgvector.dimensions in application.yml
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE invoice_source   AS ENUM ('UPLOADED', 'GSTR2B');
CREATE TYPE invoice_status   AS ENUM ('PENDING', 'MATCHED', 'MISMATCHED', 'IGNORED');
CREATE TYPE mismatch_type    AS ENUM ('NAME', 'AMOUNT', 'MISSING', 'DATE', 'GSTIN');
CREATE TYPE mismatch_status  AS ENUM ('PENDING', 'RESOLVED', 'WRITTEN_OFF', 'ESCALATED');
CREATE TYPE risk_label       AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE action_type      AS ENUM ('EMAIL_DRAFT', 'ESCALATE', 'AUTO_RESOLVE', 'FLAG_REVIEW');
CREATE TYPE action_status    AS ENUM ('PENDING', 'SENT', 'FAILED', 'COMPLETED');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: vendors
-- Canonical vendor registry with alias support and trust scoring.
-- Created before invoices because invoices reference it via FK.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vendors (
    id                      UUID            NOT NULL DEFAULT uuid_generate_v4(),
    gstin                   VARCHAR(15)     NOT NULL,
    canonical_name          VARCHAR(255)    NOT NULL,
    -- JSONB array of known alternate names, e.g. ["Acme Ltd", "ACME LIMITED"]
    alias_names             JSONB           NOT NULL DEFAULT '[]'::JSONB,
    -- 0.0 (untrusted) → 1.0 (fully trusted), updated by reconciliation engine
    trust_score             NUMERIC(5, 4)   NOT NULL DEFAULT 1.0000
                                            CHECK (trust_score BETWEEN 0.0 AND 1.0),
    mismatch_history_count  INTEGER         NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT vendors_pkey PRIMARY KEY (id),
    -- GSTIN is India's 15-character GST Identification Number — unique per vendor
    CONSTRAINT vendors_gstin_unique UNIQUE (gstin),
    CONSTRAINT vendors_gstin_format CHECK (
        gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    )
);

COMMENT ON TABLE  vendors                       IS 'Canonical vendor registry with GSTIN validation, alias tracking and trust scoring';
COMMENT ON COLUMN vendors.gstin                 IS '15-character GST Identification Number (validated via regex)';
COMMENT ON COLUMN vendors.alias_names           IS 'JSONB array of known alternate vendor name spellings';
COMMENT ON COLUMN vendors.trust_score           IS 'Computed trust score 0.0–1.0; decreases with unresolved mismatches';
COMMENT ON COLUMN vendors.mismatch_history_count IS 'Cumulative count of mismatches ever raised against this vendor';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: invoices
-- Core invoice store. Holds both user-uploaded invoices and GSTR-2B records.
-- Contains a pgvector embedding column for AI-based name similarity searches.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    vendor_id       UUID            NULL,           -- FK to vendors; NULL if vendor not yet resolved
    vendor_name     VARCHAR(255)    NOT NULL,        -- Raw name as it appears on the invoice
    gstin           VARCHAR(15)     NOT NULL,
    invoice_number  VARCHAR(100)    NOT NULL,
    amount          NUMERIC(18, 2)  NOT NULL CHECK (amount >= 0),
    tax_amount      NUMERIC(18, 2)  NOT NULL CHECK (tax_amount >= 0),
    invoice_date    DATE            NOT NULL,
    source          invoice_source  NOT NULL,
    status          invoice_status  NOT NULL DEFAULT 'PENDING',
    -- File reference for uploaded invoices (S3 key or local path)
    file_reference  TEXT            NULL,
    -- Raw extracted JSON from parsing (useful for audit trail)
    raw_data        JSONB           NULL,
    -- pgvector embedding of vendor_name (384-dim; see note at top)
    -- Used for semantic fuzzy matching across uploaded vs GSTR-2B invoices
    name_embedding  VECTOR(768)     NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_vendor_fk
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL,
    CONSTRAINT invoices_gstin_format CHECK (
        gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    ),
    -- An invoice_number + source combination must be unique to avoid duplicates
    CONSTRAINT invoices_number_source_unique UNIQUE (invoice_number, gstin, source)
);

COMMENT ON TABLE  invoices                  IS 'Central invoice store for both user uploads and GSTR-2B portal data';
COMMENT ON COLUMN invoices.source           IS 'UPLOADED = from user file; GSTR2B = fetched from GST portal';
COMMENT ON COLUMN invoices.name_embedding   IS 'Vector(384) embedding of vendor_name for cosine-similarity matching';
COMMENT ON COLUMN invoices.raw_data         IS 'Full parsed invoice JSON for audit and re-processing';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: mismatches
-- Detected discrepancies between an uploaded invoice and its GSTR-2B counterpart.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE mismatches (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    -- invoice_id_a: the invoice from user's books (UPLOADED source)
    invoice_id_a    UUID            NOT NULL,
    -- invoice_id_b: the corresponding GSTR-2B invoice (NULL when type=MISSING)
    invoice_id_b    UUID            NULL,
    mismatch_type   mismatch_type   NOT NULL,
    -- Absolute monetary difference between the two invoices (NULL for non-amount mismatches)
    amount_diff     NUMERIC(18, 2)  NULL,
    -- AI-computed risk score 0.0–1.0; drives triage priority
    risk_score      NUMERIC(5, 4)   NOT NULL DEFAULT 0.0000
                                    CHECK (risk_score BETWEEN 0.0 AND 1.0),
    status          mismatch_status NOT NULL DEFAULT 'PENDING',
    -- Free-form notes from analysts during resolution
    resolution_note TEXT            NULL,
    resolved_by     VARCHAR(100)    NULL,   -- username/email of resolver
    resolved_at     TIMESTAMPTZ     NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT mismatches_pkey PRIMARY KEY (id),
    CONSTRAINT mismatches_invoice_a_fk
        FOREIGN KEY (invoice_id_a) REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT mismatches_invoice_b_fk
        FOREIGN KEY (invoice_id_b) REFERENCES invoices (id) ON DELETE SET NULL,
    -- Enforce: resolved status must have a resolver and timestamp
    CONSTRAINT mismatches_resolved_check CHECK (
        (status = 'PENDING' OR status = 'ESCALATED')
        OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    )
);

COMMENT ON TABLE  mismatches                IS 'Discrepancies detected between uploaded invoices and GSTR-2B entries';
COMMENT ON COLUMN mismatches.invoice_id_b   IS 'NULL when mismatch_type = MISSING (no matching GSTR-2B record found)';
COMMENT ON COLUMN mismatches.risk_score     IS 'AI risk score 0.0–1.0; combined from amount_diff, vendor trust, and history';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: risk_scores
-- Detailed audit record for each AI risk assessment on a mismatch.
-- Multiple versions may exist per mismatch as the model is retrained.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE risk_scores (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    mismatch_id     UUID            NOT NULL,
    score           NUMERIC(5, 4)   NOT NULL CHECK (score BETWEEN 0.0 AND 1.0),
    label           risk_label      NOT NULL,
    -- Serialised feature vector used by the scoring model (for explainability)
    features_json   JSONB           NOT NULL DEFAULT '{}'::JSONB,
    -- Model version string, e.g. "ollama/llama3.2:1b@2024-06"
    model_version   VARCHAR(100)    NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT risk_scores_pkey PRIMARY KEY (id),
    CONSTRAINT risk_scores_mismatch_fk
        FOREIGN KEY (mismatch_id) REFERENCES mismatches (id) ON DELETE CASCADE
);

COMMENT ON TABLE  risk_scores               IS 'Immutable audit log of AI risk assessments for each mismatch';
COMMENT ON COLUMN risk_scores.features_json IS 'Feature map used by model: amount_diff, vendor_trust, frequency, days_gap, etc.';
COMMENT ON COLUMN risk_scores.model_version IS 'Full model identifier for reproducibility and drift detection';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_actions
-- Records every action the AI reconciliation agent recommends or takes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE agent_actions (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    mismatch_id     UUID            NOT NULL,
    action_type     action_type     NOT NULL,
    -- Generated content: email body draft, escalation memo, resolution rationale
    content         TEXT            NOT NULL,
    status          action_status   NOT NULL DEFAULT 'PENDING',
    -- Who (human or system) approved/rejected this action
    actioned_by     VARCHAR(100)    NULL,
    actioned_at     TIMESTAMPTZ     NULL,
    -- AI model that generated this action
    model_version   VARCHAR(100)    NULL,
    -- Prompt that produced this action (for debugging + fine-tuning)
    prompt_snapshot TEXT            NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT agent_actions_pkey PRIMARY KEY (id),
    CONSTRAINT agent_actions_mismatch_fk
        FOREIGN KEY (mismatch_id) REFERENCES mismatches (id) ON DELETE CASCADE
);

COMMENT ON TABLE  agent_actions                IS 'AI-generated action recommendations for each mismatch (email drafts, escalations, auto-resolves)';
COMMENT ON COLUMN agent_actions.prompt_snapshot IS 'Stored prompt used by the LLM — enables reproducibility and prompt audits';

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER vendors_set_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invoices_set_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER mismatches_set_updated_at
    BEFORE UPDATE ON mismatches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER agent_actions_set_updated_at
    BEFORE UPDATE ON agent_actions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SPRING AI VECTOR STORE TABLE
-- Required by Spring AI PGVectorStore auto-configuration.
-- Dimension must match spring.ai.vectorstore.pgvector.dimensions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vector_store (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    content     TEXT        NULL,
    metadata    JSONB       NULL,
    embedding   VECTOR(768) NULL,

    CONSTRAINT vector_store_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE vector_store IS 'Spring AI managed vector store for RAG document embeddings';
