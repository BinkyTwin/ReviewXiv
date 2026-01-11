/**
 * RAG Context Builder
 * Builds LLM context from retrieved chunks with citation metadata
 */

import type { ContextChunk } from "@/types/rag";

/**
 * Build context string from retrieved chunks
 * Includes metadata for citation extraction
 * @param chunks Retrieved chunks from semantic search
 * @param highlightContext Optional highlight context from user selection
 * @returns Formatted context string
 */
export function buildChunkContext(
  chunks: ContextChunk[],
  highlightContext?: { page: number; text: string },
): string {
  let context = "";

  // Add highlight context if present (user selected text)
  if (highlightContext) {
    context += `\n[SELECTED PASSAGE - Page ${highlightContext.page}]\n`;
    context += highlightContext.text + "\n\n";
    context += "---\n";
  }

  // Group chunks by page for better readability
  const chunksByPage = chunks.reduce(
    (acc, chunk) => {
      const page = chunk.pageNumber;
      if (!acc[page]) acc[page] = [];
      acc[page].push(chunk);
      return acc;
    },
    {} as Record<number, ContextChunk[]>,
  );

  // Build context with page headers and chunk metadata
  const sortedPages = Object.keys(chunksByPage)
    .map(Number)
    .sort((a, b) => a - b);

  for (const pageNum of sortedPages) {
    const pageChunks = chunksByPage[pageNum];

    // Sort chunks by offset within page
    pageChunks.sort((a, b) => a.startOffset - b.startOffset);

    context += `\n[PAGE ${pageNum}]\n`;

    for (const chunk of pageChunks) {
      // Include chunk metadata for citation extraction
      // Format: [CHUNK:id:start-end]
      context += `[CHUNK:${chunk.chunkId}:${chunk.startOffset}-${chunk.endOffset}]\n`;
      context += chunk.content + "\n\n";
    }
  }

  return context;
}

/**
 * Extract chunk metadata from context string
 * Used for mapping citations back to page offsets
 */
export function parseChunkMetadata(
  context: string,
): Map<string, { page: number; start: number; end: number }> {
  const metadata = new Map<
    string,
    { page: number; start: number; end: number }
  >();

  let currentPage = 1;
  const lines = context.split("\n");

  for (const line of lines) {
    // Track current page
    const pageMatch = line.match(/\[PAGE (\d+)\]/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Extract chunk metadata
    const chunkMatch = line.match(/\[CHUNK:([^:]+):(\d+)-(\d+)\]/);
    if (chunkMatch) {
      const [, chunkId, start, end] = chunkMatch;
      metadata.set(chunkId, {
        page: currentPage,
        start: parseInt(start, 10),
        end: parseInt(end, 10),
      });
    }
  }

  return metadata;
}

/**
 * Get the total token estimate for chunks
 * Rough estimate: 4 characters per token
 */
export function estimateTokens(chunks: ContextChunk[]): number {
  const totalChars = chunks.reduce(
    (sum, chunk) => sum + chunk.content.length,
    0,
  );
  return Math.ceil(totalChars / 4);
}

/**
 * Format retrieved chunks as a summary for debugging/logging
 */
export function summarizeRetrievedChunks(chunks: ContextChunk[]): string {
  if (chunks.length === 0) return "No chunks retrieved";

  const pages = [...new Set(chunks.map((c) => c.pageNumber))].sort(
    (a, b) => a - b,
  );
  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;

  return `Retrieved ${chunks.length} chunks from pages ${pages.join(", ")} (avg score: ${avgScore.toFixed(3)})`;
}
