/**
 * POST /api/search/chunks
 * Semantic search for relevant chunks using RAG
 * Supports hybrid search (BM25 + vector), MMR, and LLM re-ranking
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "@/lib/embeddings/openrouter";
import { rerankWithLLM } from "@/lib/reranking/llm-reranker";
import type {
  ChunkSearchRequest,
  ChunkSearchResponse,
  ContextChunk,
  RetrievalOptions,
} from "@/types/rag";

export const runtime = "nodejs";

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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ChunkSearchResponse | { error: string }>> {
  const startTime = Date.now();

  try {
    const body: ChunkSearchRequest = await request.json();
    const { paperId, query, options: userOptions } = body;

    if (!paperId || !query) {
      return NextResponse.json(
        { error: "paperId and query are required" },
        { status: 400 },
      );
    }

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

    return NextResponse.json({
      chunks: results,
      searchTime,
      method: searchMethod,
    });
  } catch (error) {
    console.error("Chunk search error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
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
