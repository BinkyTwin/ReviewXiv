/**
 * POST /api/embeddings/generate
 * Generate embeddings for all chunks of a paper
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbeddingsBatched,
  getEmbeddingModel,
} from "@/lib/embeddings/openrouter";
import {
  withLock,
} from "@/lib/embeddings/lock-manager";
import type {
  EmbeddingGenerateRequest,
  EmbeddingGenerateResponse,
  EmbeddingStatus,
} from "@/types/rag";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for large papers

interface ChunkRecord {
  id: string;
  content: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<EmbeddingGenerateResponse | { error: string }>> {
  let paperId: string | undefined;

  try {
    const body: EmbeddingGenerateRequest = await request.json();
    paperId = body.paperId;
    const force = body.force ?? false;

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Wrapper avec lock pour concurrence control
      return await withLock(paperId, "complete", async () => {
      // Update paper status to processing
      await supabase
        .from("papers")
        .update({ embedding_status: "processing" as EmbeddingStatus })
        .eq("id", paperId);

      // Get chunks that need embeddings
      let query = supabase
        .from("chunks")
        .select("id, content")
        .eq("paper_id", paperId)
        .order("page_number", { ascending: true })
        .order("chunk_index", { ascending: true });

      // If not forcing, only get chunks without embeddings
      if (!force) {
        query = query.is("embedding", null);
      }

      const { data: chunks, error: chunksError } = await query;

      if (chunksError) {
        throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
      }

      if (!chunks || chunks.length === 0) {
        // Update paper status to complete
        await supabase
          .from("papers")
          .update({ embedding_status: "complete" as EmbeddingStatus })
          .eq("id", paperId);

        return NextResponse.json({
          status: "complete",
          processed: 0,
          failed: 0,
          total: 0,
          message: "All chunks already have embeddings",
        });
      }

      // Get total chunks count for the paper
      const { count: totalCount } = await supabase
        .from("chunks")
        .select("id", { count: "exact", head: true })
        .eq("paper_id", paperId);

      // Extract texts for embedding
      const texts = (chunks as ChunkRecord[]).map((c) => c.content);
      const chunkIds = (chunks as ChunkRecord[]).map((c) => c.id);

      console.log(`[LAZY EMBEDDINGS] Generating for paper ${paperId} (${chunks.length} chunks)...`);

      // Generate embeddings in batches
      const { embeddings, totalTokens, failedIndices } =
        await generateEmbeddingsBatched(texts);

      // Update chunks with embeddings
      let processed = 0;
      let failed = failedIndices.length;
      const model = getEmbeddingModel();
      const now = new Date().toISOString();

      for (let i = 0; i < chunkIds.length; i++) {
        // Skip if this index failed during embedding
        if (failedIndices.includes(i)) {
          continue;
        }

        const embedding = embeddings[i];
        if (!embedding) {
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("chunks")
          .update({
            embedding: embedding,
            embedding_model: model,
            embedded_at: now,
          })
          .eq("id", chunkIds[i]);

        if (updateError) {
          console.error(`Failed to update chunk ${chunkIds[i]}:`, updateError);
          failed++;
        } else {
          processed++;
        }
      }

      // Determine final status
      const finalStatus: EmbeddingStatus =
        failed === 0
          ? "complete"
          : failed === chunks.length
            ? "error"
            : "partial";

      // Get updated embedded count
      const { count: embeddedCount } = await supabase
        .from("chunks")
        .select("id", { count: "exact", head: true })
        .eq("paper_id", paperId)
        .not("embedding", "is", null);

      // Update paper embedding status
      await supabase
        .from("papers")
        .update({
          embedding_status: finalStatus,
          embedded_chunks: embeddedCount || 0,
          total_chunks: totalCount || 0,
        })
        .eq("id", paperId);

      console.log(
        `[LAZY EMBEDDINGS] Completed for paper ${paperId}: ${processed} processed, ${failed} failed, ${totalTokens} tokens used`,
      );

      return NextResponse.json({
        status: finalStatus,
        processed,
        failed,
        total: chunks.length,
        message: `Generated embeddings for ${processed}/${chunks.length} chunks`,
      });
    });

  } catch (error) {
    console.error("[LAZY EMBEDDINGS] Error:", error);

    // Try to update paper status to error if we have paperId
    if (paperId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("papers")
          .update({ embedding_status: "error" as EmbeddingStatus })
          .eq("id", paperId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Embedding generation failed",
      },
      { status: 500 },
    );
  }
}
