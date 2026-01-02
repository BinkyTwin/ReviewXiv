/**
 * POST /api/search/chunks
 * Semantic search for relevant chunks using RAG
 * Supports hybrid search (BM25 + vector), MMR, and LLM re-ranking
 */

import { NextRequest, NextResponse } from "next/server";
import { searchChunks } from "@/lib/rag/search";
import type { ChunkSearchRequest, ChunkSearchResponse } from "@/types/rag";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ChunkSearchResponse | { error: string }>> {
  try {
    const body: ChunkSearchRequest = await request.json();
    const { paperId, query, options } = body;

    if (!paperId || !query) {
      return NextResponse.json(
        { error: "paperId and query are required" },
        { status: 400 },
      );
    }

    const result = await searchChunks(paperId, query, options);

    return NextResponse.json(result);
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
