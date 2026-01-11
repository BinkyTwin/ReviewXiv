-- Migration: Add full-text search capabilities for BM25/hybrid search
-- This enables combining keyword search with vector similarity

-- Add tsvector column with automatic generation from content
-- Using 'french' configuration for French academic papers
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('french', content)) STORED;

-- Create GIN index for efficient full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_content_tsv
ON chunks USING gin(content_tsv);

-- Comment on column
COMMENT ON COLUMN chunks.content_tsv IS 'Full-text search vector for BM25 hybrid search';
