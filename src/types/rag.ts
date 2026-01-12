/**
 * Types for the RAG (Retrieval-Augmented Generation) system
 */

/**
 * Chunk with embedding metadata from database
 */
export interface ChunkWithEmbedding {
  id: string;
  paper_id: string;
  page_id: string;
  page_number: number;
  chunk_index: number;
  section_id?: string | null;
  content: string;
  start_offset: number;
  end_offset: number;
  embedding?: number[] | null;
  embedding_model?: string | null;
  embedded_at?: string | null;
}

/**
 * Search result from hybrid/vector search
 */
export interface ChunkSearchResult {
  id: string;
  paper_id: string;
  page_id: string;
  page_number: number;
  chunk_index: number;
  section_id?: string | null;
  content: string;
  start_offset: number;
  end_offset: number;
  vector_score: number;
  text_score: number;
  combined_score: number;
}

/**
 * Re-ranked search result
 */
export interface RerankedChunk extends ChunkSearchResult {
  rerank_score: number;
  original_rank: number;
  final_rank: number;
}

/**
 * RAG retrieval options
 */
export interface RetrievalOptions {
  /** Number of chunks to retrieve (default: 8) */
  topK?: number;
  /** Use hybrid search - BM25 + vector (default: true) */
  useHybrid?: boolean;
  /** Apply MMR for diversity (default: true) */
  useMmr?: boolean;
  /** MMR lambda - 0=diversity, 1=relevance (default: 0.7) */
  mmrLambda?: number;
  /** Apply LLM re-ranking (default: true) */
  useReranking?: boolean;
  /** Number of candidates for re-ranking (default: 20) */
  rerankCandidates?: number;
  /** Filter to specific page range */
  pageRange?: { start: number; end: number };
}

/**
 * Context chunk for LLM with citation metadata
 */
export interface ContextChunk {
  content: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  chunkId: string;
  score: number;
  sectionId?: string | null;
}

/**
 * Embedding request to OpenRouter
 */
export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

/**
 * Embedding response from OpenRouter
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Paper embedding status
 */
export type EmbeddingStatus =
  | "pending"
  | "processing"
  | "complete"
  | "partial"
  | "error";

/**
 * Search request to /api/search/chunks
 */
export interface ChunkSearchRequest {
  paperId: string;
  query: string;
  options?: RetrievalOptions;
}

/**
 * Search response from /api/search/chunks
 */
export interface ChunkSearchResponse {
  chunks: ContextChunk[];
  searchTime: number;
  method: "hybrid" | "vector" | "mmr";
}

/**
 * Embedding generation request
 */
export interface EmbeddingGenerateRequest {
  paperId: string;
  force?: boolean;
}

/**
 * Embedding generation response
 */
export interface EmbeddingGenerateResponse {
  status: EmbeddingStatus;
  processed: number;
  failed: number;
  total: number;
  message?: string;
}

/**
 * Embedding status response
 */
export interface EmbeddingStatusResponse {
  paperId: string;
  status: EmbeddingStatus;
  embeddedChunks: number;
  totalChunks: number;
  embeddingModel?: string;
  lastEmbeddedAt?: string;
}
