/**
 * olmOCR Client for LMStudio
 *
 * Connects to a local LMStudio instance running olmOCR-2-7B model
 * API compatible with OpenAI /v1/chat/completions
 *
 * @see https://jonathansoma.com/words/olmocr-on-macos-with-lm-studio.html
 */

import { OlmOCRRequest, OlmOCRResponse } from "./types";

const DEFAULT_LMSTUDIO_URL = "http://localhost:1234/v1";
const DEFAULT_MODEL = "allenai/olmocr-2-7b";

interface LMStudioConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string; // Default "lm-studio" for local
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * olmOCR prompt template
 * Based on Allen AI's recommended format
 */
function buildOCRPrompt(metadata?: OlmOCRRequest["metadata"]): string {
  const pageInfo = metadata
    ? `Page ${metadata.pageNumber} of ${metadata.totalPages}. `
    : "";

  return `${pageInfo}Extract all text from this document image.
Output the content in clean markdown format, preserving:
- Document structure (headings, paragraphs, lists)
- Tables (use markdown table syntax)
- Mathematical equations (use LaTeX notation)
- Reading order (left-to-right, top-to-bottom, handling columns correctly)

Do not include any commentary or explanations, only the extracted text.`;
}

/**
 * Check if LMStudio is available
 */
export async function checkLMStudioAvailable(
  baseUrl: string = DEFAULT_LMSTUDIO_URL,
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer lm-studio`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from LMStudio
 */
export async function getAvailableModels(
  baseUrl: string = DEFAULT_LMSTUDIO_URL,
): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer lm-studio`,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data?.map((m: { id: string }) => m.id) || [];
  } catch {
    return [];
  }
}

/**
 * Extract text from an image using olmOCR via LMStudio
 *
 * @param request - Image and metadata for OCR
 * @param config - LMStudio configuration
 * @returns Markdown text extracted from the image
 */
export async function extractTextWithOlmOCR(
  request: OlmOCRRequest,
  config: LMStudioConfig = {},
): Promise<OlmOCRResponse> {
  const {
    baseUrl = DEFAULT_LMSTUDIO_URL,
    model = DEFAULT_MODEL,
    apiKey = "lm-studio",
  } = config;

  // Ensure image is properly formatted as data URL
  const imageUrl = request.image.startsWith("data:")
    ? request.image
    : `data:image/png;base64,${request.image}`;

  const prompt = buildOCRPrompt(request.metadata);

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0, // Deterministic output for OCR
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LMStudio OCR failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data: ChatCompletionResponse = await response.json();

  const markdown = data.choices[0]?.message?.content || "";

  return {
    markdown,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Process multiple pages in sequence
 */
export async function extractTextFromPages(
  pages: { pageNumber: number; imageBase64: string }[],
  totalPages: number,
  config: LMStudioConfig = {},
  onProgress?: (pageNumber: number, total: number) => void,
): Promise<Map<number, OlmOCRResponse>> {
  const results = new Map<number, OlmOCRResponse>();

  for (const page of pages) {
    if (onProgress) {
      onProgress(page.pageNumber, totalPages);
    }

    const result = await extractTextWithOlmOCR(
      {
        image: page.imageBase64,
        metadata: {
          pageNumber: page.pageNumber,
          totalPages,
          width: 0, // Will be set by caller
          height: 0,
        },
      },
      config,
    );

    results.set(page.pageNumber, result);
  }

  return results;
}

/**
 * Create a client instance with pre-configured settings
 */
export function createOlmOCRClient(config: LMStudioConfig = {}) {
  return {
    checkAvailable: () => checkLMStudioAvailable(config.baseUrl),
    getModels: () => getAvailableModels(config.baseUrl),
    extractText: (request: OlmOCRRequest) =>
      extractTextWithOlmOCR(request, config),
    extractPages: (
      pages: { pageNumber: number; imageBase64: string }[],
      totalPages: number,
      onProgress?: (pageNumber: number, total: number) => void,
    ) => extractTextFromPages(pages, totalPages, config, onProgress),
  };
}

export type OlmOCRClient = ReturnType<typeof createOlmOCRClient>;
