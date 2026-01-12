/**
 * LLM-based Re-ranking using OpenRouter
 * Uses a lightweight model to score query-chunk relevance
 */

import type { ContextChunk } from "@/types/rag";
import { logReranking } from "@/lib/monitoring/logger";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const RERANK_MODEL = "google/gemma-3n-e4b-it:free"; // Lightweight model for fast scoring

interface RerankResult {
  chunk: ContextChunk;
  rerankScore: number;
  originalRank: number;
}

/**
 * Re-rank chunks using LLM scoring
 * @param query The search query
 * @param chunks Chunks to re-rank
 * @param topK Number of top chunks to return
 * @returns Re-ranked chunks
 */
export async function rerankWithLLM(
  query: string,
  chunks: ContextChunk[],
  topK: number = 8,
): Promise<ContextChunk[]> {
  const apiKey = process.env.OPENROUTER_API;

  if (!apiKey) {
    console.warn("OPENROUTER_API not set, skipping re-ranking");
    return chunks.slice(0, topK);
  }

  if (chunks.length === 0) {
    return [];
  }

  // If we have fewer chunks than topK, no need to re-rank
  if (chunks.length <= topK) {
    return chunks;
  }

  try {
    // Score all chunks in parallel batches
    const scores = await scoreChunks(query, chunks);

    // Combine chunks with scores
    const ranked: RerankResult[] = chunks.map((chunk, index) => ({
      chunk,
      rerankScore: scores[index] || 0,
      originalRank: index,
    }));

    // Sort by rerank score (descending)
    ranked.sort((a, b) => b.rerankScore - a.rerankScore);

    // Return top K chunks with updated scores
    return ranked.slice(0, topK).map((r) => ({
      ...r.chunk,
      score: r.rerankScore,
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[RERANK ERROR] Re-ranking failed: ${errorMsg}`);
    console.error(`[RERANK ERROR] Using fallback: returning top ${topK} chunks without re-ranking`);

    logReranking({
      success: false,
      error: errorMsg,
      chunkCount: chunks.length,
      topK
    });

    return chunks.slice(0, topK);
  }
}

/**
 * Score multiple chunks against a query
 */
async function scoreChunks(
  query: string,
  chunks: ContextChunk[],
): Promise<number[]> {
  // Batch chunks to avoid too many API calls
  const BATCH_SIZE = 5;
  const scores: number[] = new Array(chunks.length).fill(0);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchScores = await scoreBatch(query, batch);

    for (let j = 0; j < batchScores.length; j++) {
      scores[i + j] = batchScores[j];
    }
  }

  return scores;
}

/**
 * Score a batch of chunks in a single LLM call
 */
async function scoreBatch(
  query: string,
  chunks: ContextChunk[],
): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API;

  // Build prompt for batch scoring
  const passages = chunks
    .map(
      (chunk, idx) =>
        `[Passage ${idx + 1}]\n${chunk.content.slice(0, 300)}${chunk.content.length > 300 ? "..." : ""}`,
    )
    .join("\n\n");

  const prompt = `You are a relevance scoring system. Score how relevant each passage is to the query.

Query: "${query}"

${passages}

For each passage, provide a relevance score from 0 to 10 where:
- 0: Completely irrelevant
- 5: Somewhat relevant, mentions related topics
- 10: Highly relevant, directly answers or addresses the query

Respond ONLY with a JSON array of scores in order, like: [7, 3, 9, 5, 2]
No explanation, just the array.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "ReviewXiv",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM rerank error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse scores from response
    const scores = parseScores(content, chunks.length);
    return scores;
  } catch (error) {
    console.error("Batch scoring failed:", error);
    // Return default scores (based on original rank)
    return chunks.map((_, idx) => 10 - idx);
  }
}

/**
 * Parse scores from LLM response
 */
function parseScores(content: string, expectedLength: number): number[] {
  try {
    // Try to extract JSON array from response
    const match = content.match(/\[[\d,.\s]+\]/);
    if (match) {
      const scores = JSON.parse(match[0]) as number[];
      // Normalize to 0-1 range and pad if needed
      return normalizeScores(scores, expectedLength);
    }
  } catch {
    // Parse failed
  }

  // Fallback: return decreasing scores
  return Array.from({ length: expectedLength }, (_, i) => 1 - i * 0.1);
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScores(scores: number[], expectedLength: number): number[] {
  // Pad with zeros if needed
  while (scores.length < expectedLength) {
    scores.push(0);
  }

  // Truncate if needed
  scores = scores.slice(0, expectedLength);

  // Normalize to 0-1 range
  const max = Math.max(...scores, 1);
  return scores.map((s) => s / max);
}
