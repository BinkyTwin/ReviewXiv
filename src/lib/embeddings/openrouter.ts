/**
 * OpenRouter Embeddings Client
 * Uses openai/text-embedding-3-small for generating embeddings (1536 dimensions)
 */

import type { EmbeddingResponse } from "@/types/rag";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";
const DEFAULT_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 25;

interface OpenRouterEmbeddingData {
  object: string;
  embedding: number[];
  index: number;
}

interface OpenRouterEmbeddingResponse {
  object: string;
  data: OpenRouterEmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embeddings for multiple texts using OpenRouter
 * @param texts Array of texts to embed
 * @param model Optional model override
 * @returns Array of embeddings (1536 dimensions each)
 */
export async function generateEmbeddings(
  texts: string[],
  model: string = DEFAULT_MODEL,
): Promise<EmbeddingResponse> {
  const apiKey = process.env.OPENROUTER_API;

  if (!apiKey) {
    throw new Error("OPENROUTER_API is not configured");
  }

  if (texts.length === 0) {
    return {
      embeddings: [],
      model,
      usage: { prompt_tokens: 0, total_tokens: 0 },
    };
  }

  // OpenRouter uses OpenAI-compatible API
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
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter embedding error: ${response.status} - ${errorText}`,
    );
  }

  const data: OpenRouterEmbeddingResponse = await response.json();

  // Sort embeddings by index to match input order
  const sortedEmbeddings = data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);

  return {
    embeddings: sortedEmbeddings,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Generate embedding for a single query
 * Uses "query" input type for better retrieval performance
 * @param query The search query
 * @param model Optional model override
 * @returns Single embedding vector (1536 dimensions)
 */
export async function generateQueryEmbedding(
  query: string,
  model: string = DEFAULT_MODEL,
): Promise<number[]> {
  const result = await generateEmbeddings([query], model);

  if (result.embeddings.length === 0) {
    throw new Error("No embedding returned for query");
  }

  return result.embeddings[0];
}

/**
 * Generate embeddings in batches to avoid rate limits
 * @param texts Array of texts to embed
 * @param batchSize Size of each batch (default: 25)
 * @param onProgress Optional callback for progress updates
 * @returns Array of embeddings
 */
export async function generateEmbeddingsBatched(
  texts: string[],
  batchSize: number = MAX_BATCH_SIZE,
  onProgress?: (processed: number, total: number) => void,
): Promise<{
  embeddings: number[][];
  totalTokens: number;
  failedIndices: number[];
}> {
  const embeddings: number[][] = new Array(texts.length);
  const failedIndices: number[] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchIndices = batch.map((_, idx) => i + idx);

    try {
      const result = await generateEmbeddings(batch);

      // Store embeddings at correct indices
      for (let j = 0; j < result.embeddings.length; j++) {
        embeddings[batchIndices[j]] = result.embeddings[j];
      }

      totalTokens += result.usage.total_tokens;

      // Small delay between batches to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Batch ${i / batchSize} failed:`, error);
      // Mark all indices in failed batch
      failedIndices.push(...batchIndices);
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }
  }

  return { embeddings, totalTokens, failedIndices };
}

/**
 * Get the embedding model name
 */
export function getEmbeddingModel(): string {
  return DEFAULT_MODEL;
}

/**
 * Get the embedding dimensions
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}
