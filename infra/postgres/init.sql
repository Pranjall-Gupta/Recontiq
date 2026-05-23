-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL bootstrap — executed ONCE by the Docker entrypoint
-- Enables required extensions before Flyway migrations run.
-- ─────────────────────────────────────────────────────────────────────────────

-- pgvector: vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- uuid-ossp: UUID generation in SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: trigram-based fuzzy text search (vendor name matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- btree_gin: GIN indexes on scalar types
CREATE EXTENSION IF NOT EXISTS btree_gin;
