-- Migration: Add embedding status tracking to papers table

-- Add embedding status columns
ALTER TABLE papers
ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS embedded_chunks int DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_chunks int DEFAULT 0;

-- Add check constraint for valid status values
ALTER TABLE papers
ADD CONSTRAINT valid_embedding_status
CHECK (embedding_status IN ('pending', 'processing', 'complete', 'partial', 'error'));

-- Create index for filtering papers by embedding status
CREATE INDEX IF NOT EXISTS idx_papers_embedding_status
ON papers (embedding_status)
WHERE embedding_status IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN papers.embedding_status IS 'Status of embedding generation: pending, processing, complete, partial, error';
COMMENT ON COLUMN papers.embedded_chunks IS 'Number of chunks with embeddings';
COMMENT ON COLUMN papers.total_chunks IS 'Total number of chunks in paper';
