/**
 * RAG Search Module
 * Core search functionality for semantic retrieval
 * Can be called directly without HTTP overhead
 */

import { createClient } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "@/lib/embeddings/openrouter";
import { rerankWithLLM } from "@/lib/reranking/llm-reranker";
import type {
  ChunkSearchResponse,
  ContextChunk,
  RetrievalOptions,
} from "@/types/rag";

const DEFAULT_OPTIONS: Required<Omit<RetrievalOptions, "pageRange">> & {
  pageRange: { start: number; end: number } | undefined;
} = {
  topK: 8,
  useHybrid: true,
  useMmr: true,
  mmrLambda: 0.7,
  useReranking: true,
  rerankCandidates: 20,
  pageRange: undefined,
};

interface HybridSearchResult {
  id: string;
  paper_id: string;
  page_id: string;
  page_number: number;
  chunk_index: number;
  content: string;
  start_offset: number;
  end_offset: number;
  vector_score: number;
  text_score: number;
  combined_score: number;
}

interface VectorSearchResult {
  id: string;
  paper_id: string;
  page_id: string;
  page_number: number;
  chunk_index: number;
  content: string;
  start_offset: number;
  end_offset: number;
  similarity: number;
}

interface MmrSearchResult {
  id: string;
  paper_id: string;
  page_id: string;
  page_number: number;
  chunk_index: number;
  content: string;
  start_offset: number;
  end_offset: number;
  relevance_score: number;
  mmr_score: number;
}

/**
 * Search for relevant chunks using semantic search
 * Supports hybrid search (BM25 + vector), MMR, and LLM re-ranking
 *
 * @param paperId - The paper ID to search within
 * @param query - The search query
 * @param userOptions - Optional retrieval options
 * @returns Search results with chunks and metadata
 */
export async function searchChunks(
  paperId: string,
  query: string,
  userOptions?: RetrievalOptions,
): Promise<ChunkSearchResponse> {
  const startTime = Date.now();
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const supabase = await createClient();

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  let results: ContextChunk[];
  let searchMethod: "hybrid" | "vector" | "mmr" = "vector";

  // Determine number of candidates to retrieve
  const candidateCount = options.useReranking
    ? options.rerankCandidates
    : options.topK;

  if (options.useMmr) {
    // Use MMR for diverse results
    searchMethod = "mmr";
    const { data, error } = await supabase.rpc("search_chunks_mmr", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      target_paper_id: paperId,
      match_count: candidateCount,
      lambda: options.mmrLambda,
      candidate_count: 50,
    });

    if (error) {
      console.error("MMR search error:", error);
      throw new Error(`MMR search failed: ${error.message}`);
    }

    results = mapMmrResults(data as MmrSearchResult[] | null);
  } else if (options.useHybrid) {
    // Use hybrid search (BM25 + vector)
    searchMethod = "hybrid";
    const { data, error } = await supabase.rpc("search_chunks_hybrid", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      query_text: query,
      target_paper_id: paperId,
      match_count: candidateCount,
      vector_weight: 0.7,
      text_weight: 0.3,
    });

    if (error) {
      console.error("Hybrid search error:", error);
      throw new Error(`Hybrid search failed: ${error.message}`);
    }

    results = mapHybridResults(data as HybridSearchResult[] | null);
  } else {
    // Pure vector search
    searchMethod = "vector";
    const { data, error } = await supabase.rpc("search_chunks_vector", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      target_paper_id: paperId,
      match_count: candidateCount,
    });

    if (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    results = mapVectorResults(data as VectorSearchResult[] | null);
  }

  // Apply page range filter if specified
  if (options.pageRange) {
    results = results.filter(
      (r) =>
        r.pageNumber >= options.pageRange!.start &&
        r.pageNumber <= options.pageRange!.end,
    );
  }

  // Apply LLM re-ranking if enabled
  if (options.useReranking && results.length > options.topK) {
    results = await rerankWithLLM(query, results, options.topK);
  } else {
    // Just limit to topK
    results = results.slice(0, options.topK);
  }

  const searchTime = Date.now() - startTime;

  return {
    chunks: results,
    searchTime,
    method: searchMethod,
  };
}

/**
 * Map hybrid search results to ContextChunk
 */
function mapHybridResults(data: HybridSearchResult[] | null): ContextChunk[] {
  if (!data) return [];

  return data.map((row) => ({
    content: row.content,
    pageNumber: row.page_number,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    chunkId: row.id,
    score: row.combined_score,
  }));
}

/**
 * Map vector search results to ContextChunk
 */
function mapVectorResults(data: VectorSearchResult[] | null): ContextChunk[] {
  if (!data) return [];

  return data.map((row) => ({
    content: row.content,
    pageNumber: row.page_number,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    chunkId: row.id,
    score: row.similarity,
  }));
}

/**
 * Map MMR search results to ContextChunk
 */
function mapMmrResults(data: MmrSearchResult[] | null): ContextChunk[] {
  if (!data) return [];

  return data.map((row) => ({
    content: row.content,
    pageNumber: row.page_number,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    chunkId: row.id,
    score: row.relevance_score,
  }));
}
