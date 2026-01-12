-- Migration: Add embedding column and indexes to chunks table
-- Requires pgvector extension (run 001_enable_pgvector.sql first)

-- Add embedding column (1536 dimensions for text-embedding-3-small)
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding metadata columns
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS embedding_model text,
ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- Create HNSW index for fast vector similarity search
-- m=16: number of bi-directional links per node
-- ef_construction=64: size of dynamic candidate list during construction
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE embedding IS NOT NULL;

-- Create index for filtering by paper_id during vector search
CREATE INDEX IF NOT EXISTS idx_chunks_paper_embedding
ON chunks (paper_id)
WHERE embedding IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN chunks.embedding IS 'Vector embedding from text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN chunks.embedding_model IS 'Model used for embedding generation';
COMMENT ON COLUMN chunks.embedded_at IS 'Timestamp when embedding was generated';
