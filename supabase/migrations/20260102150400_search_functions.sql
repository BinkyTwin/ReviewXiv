-- Migration: Create search functions for RAG retrieval
-- Includes hybrid search (BM25 + vector) and MMR (Maximum Marginal Relevance)

-- ============================================================================
-- Function: search_chunks_hybrid
-- Combines full-text search (BM25) with vector similarity for better results
-- ============================================================================
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  query_embedding vector(1536),
  query_text text,
  target_paper_id uuid,
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7,
  text_weight float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  paper_id uuid,
  page_id uuid,
  page_number int,
  chunk_index int,
  content text,
  start_offset int,
  end_offset int,
  vector_score float,
  text_score float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    -- Vector similarity search
    SELECT
      c.id,
      1 - (c.embedding <=> query_embedding) as v_score
    FROM chunks c
    WHERE c.paper_id = target_paper_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3  -- Get more candidates for merging
  ),
  text_results AS (
    -- Full-text search with BM25-like ranking
    SELECT
      c.id,
      ts_rank_cd(c.content_tsv, websearch_to_tsquery('french', query_text)) as t_score
    FROM chunks c
    WHERE c.paper_id = target_paper_id
      AND c.content_tsv @@ websearch_to_tsquery('french', query_text)
    ORDER BY t_score DESC
    LIMIT match_count * 3
  ),
  combined AS (
    -- Merge results with weighted scoring
    SELECT
      COALESCE(v.id, t.id) as chunk_id,
      COALESCE(v.v_score, 0)::float as vector_score,
      COALESCE(t.t_score, 0)::float as text_score,
      (COALESCE(v.v_score, 0) * vector_weight +
       COALESCE(t.t_score, 0) * text_weight)::float as combined_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    c.id,
    c.paper_id,
    c.page_id,
    c.page_number,
    c.chunk_index,
    c.content,
    c.start_offset,
    c.end_offset,
    cb.vector_score,
    cb.text_score,
    cb.combined_score
  FROM combined cb
  JOIN chunks c ON c.id = cb.chunk_id
  ORDER BY cb.combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Function: search_chunks_vector
-- Pure vector similarity search (no full-text)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_chunks_vector(
  query_embedding vector(1536),
  target_paper_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  paper_id uuid,
  page_id uuid,
  page_number int,
  chunk_index int,
  content text,
  start_offset int,
  end_offset int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.paper_id,
    c.page_id,
    c.page_number,
    c.chunk_index,
    c.content,
    c.start_offset,
    c.end_offset,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  FROM chunks c
  WHERE c.paper_id = target_paper_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Function: search_chunks_mmr
-- Maximum Marginal Relevance for diverse results
-- Balances relevance to query with diversity among selected results
-- ============================================================================
CREATE OR REPLACE FUNCTION search_chunks_mmr(
  query_embedding vector(1536),
  target_paper_id uuid,
  match_count int DEFAULT 10,
  lambda float DEFAULT 0.7,  -- Balance: 1=pure relevance, 0=pure diversity
  candidate_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  paper_id uuid,
  page_id uuid,
  page_number int,
  chunk_index int,
  content text,
  start_offset int,
  end_offset int,
  relevance_score float,
  mmr_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
  selected_ids uuid[] := ARRAY[]::uuid[];
  current_id uuid;
  current_score float;
  i int;
BEGIN
  -- Create temp table for candidates with their embeddings
  CREATE TEMP TABLE IF NOT EXISTS mmr_candidates (
    chunk_id uuid PRIMARY KEY,
    embedding vector(1536),
    relevance float
  ) ON COMMIT DROP;

  -- Clear any existing data
  TRUNCATE mmr_candidates;

  -- Get initial candidates based on vector similarity
  INSERT INTO mmr_candidates (chunk_id, embedding, relevance)
  SELECT
    c.id,
    c.embedding,
    (1 - (c.embedding <=> query_embedding))::float
  FROM chunks c
  WHERE c.paper_id = target_paper_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT candidate_count;

  -- Iteratively select using MMR criterion
  FOR i IN 1..match_count LOOP
    -- Find chunk with highest MMR score not yet selected
    SELECT
      mc.chunk_id,
      CASE
        WHEN array_length(selected_ids, 1) IS NULL THEN
          -- First selection: pure relevance
          mc.relevance
        ELSE
          -- MMR formula: lambda * relevance - (1-lambda) * max_similarity_to_selected
          lambda * mc.relevance - (1 - lambda) * (
            SELECT MAX(1 - (mc.embedding <=> sel_emb.embedding))
            FROM mmr_candidates sel_emb
            WHERE sel_emb.chunk_id = ANY(selected_ids)
          )
      END as mmr
    INTO current_id, current_score
    FROM mmr_candidates mc
    WHERE NOT (mc.chunk_id = ANY(selected_ids))
    ORDER BY 2 DESC
    LIMIT 1;

    EXIT WHEN current_id IS NULL;
    selected_ids := selected_ids || current_id;
  END LOOP;

  -- Return selected chunks in MMR order
  RETURN QUERY
  SELECT
    c.id,
    c.paper_id,
    c.page_id,
    c.page_number,
    c.chunk_index,
    c.content,
    c.start_offset,
    c.end_offset,
    mc.relevance as relevance_score,
    mc.relevance as mmr_score  -- Simplified: actual MMR score would need tracking
  FROM unnest(selected_ids) WITH ORDINALITY AS sel(chunk_id, ord)
  JOIN chunks c ON c.id = sel.chunk_id
  JOIN mmr_candidates mc ON mc.chunk_id = c.id
  ORDER BY sel.ord;

  -- Clean up
  DROP TABLE IF EXISTS mmr_candidates;
END;
$$;

-- ============================================================================
-- Function: get_paper_embedding_stats
-- Get embedding statistics for a paper
-- ============================================================================
CREATE OR REPLACE FUNCTION get_paper_embedding_stats(target_paper_id uuid)
RETURNS TABLE (
  total_chunks bigint,
  embedded_chunks bigint,
  pending_chunks bigint,
  embedding_coverage float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_chunks,
    COUNT(embedding)::bigint as embedded_chunks,
    (COUNT(*) - COUNT(embedding))::bigint as pending_chunks,
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(embedding)::float / COUNT(*)::float * 100)
      ELSE 0
    END as embedding_coverage
  FROM chunks
  WHERE paper_id = target_paper_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_chunks_hybrid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_vector TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_mmr TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_paper_embedding_stats TO anon, authenticated;

-- Comments
COMMENT ON FUNCTION search_chunks_hybrid IS 'Hybrid search combining BM25 full-text and vector similarity';
COMMENT ON FUNCTION search_chunks_vector IS 'Pure vector similarity search using pgvector';
COMMENT ON FUNCTION search_chunks_mmr IS 'Maximum Marginal Relevance search for diverse results';
COMMENT ON FUNCTION get_paper_embedding_stats IS 'Get embedding statistics for a paper';
