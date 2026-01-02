/**
 * GET /api/embeddings/status?paperId=xxx
 * Get embedding status for a paper
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmbeddingStatusResponse, EmbeddingStatus } from "@/types/rag";

interface PaperEmbeddingData {
  id: string;
  embedding_status: EmbeddingStatus | null;
  embedded_chunks: number | null;
  total_chunks: number | null;
}

interface ChunkEmbeddingData {
  embedding_model: string | null;
  embedded_at: string | null;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<EmbeddingStatusResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get("paperId");

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get paper embedding status
    const { data: paper, error: paperError } = await supabase
      .from("papers")
      .select("id, embedding_status, embedded_chunks, total_chunks")
      .eq("id", paperId)
      .single();

    if (paperError || !paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const paperData = paper as PaperEmbeddingData;

    // Get latest embedding info from chunks
    const { data: latestChunk } = await supabase
      .from("chunks")
      .select("embedding_model, embedded_at")
      .eq("paper_id", paperId)
      .not("embedded_at", "is", null)
      .order("embedded_at", { ascending: false })
      .limit(1)
      .single();

    const chunkData = latestChunk as ChunkEmbeddingData | null;

    // If status is not set, calculate from chunks
    let status = paperData.embedding_status || "pending";
    let embeddedChunks = paperData.embedded_chunks || 0;
    let totalChunks = paperData.total_chunks || 0;

    // If no stored counts, calculate from chunks
    if (totalChunks === 0) {
      const { count: total } = await supabase
        .from("chunks")
        .select("id", { count: "exact", head: true })
        .eq("paper_id", paperId);

      const { count: embedded } = await supabase
        .from("chunks")
        .select("id", { count: "exact", head: true })
        .eq("paper_id", paperId)
        .not("embedding", "is", null);

      totalChunks = total || 0;
      embeddedChunks = embedded || 0;

      // Determine status from counts
      if (totalChunks === 0) {
        status = "pending";
      } else if (embeddedChunks === 0) {
        status = "pending";
      } else if (embeddedChunks === totalChunks) {
        status = "complete";
      } else {
        status = "partial";
      }
    }

    return NextResponse.json({
      paperId,
      status: status as EmbeddingStatus,
      embeddedChunks,
      totalChunks,
      embeddingModel: chunkData?.embedding_model || undefined,
      lastEmbeddedAt: chunkData?.embedded_at || undefined,
    });
  } catch (error) {
    console.error("Embedding status error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get embedding status",
      },
      { status: 500 },
    );
  }
}
