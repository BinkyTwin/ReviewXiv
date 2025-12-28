/**
 * Mistral OCR Client
 *
 * Client for calling Mistral AI OCR API
 */

import type { MistralOCRResponse, MistralOCRRequest } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_API_KEY =
  process.env.MISTRAL_OCR_API_KEY || process.env.mistral_ocr_api;
const MISTRAL_MODEL =
  process.env.MISTRAL_OCR_MODEL ||
  process.env.mistral_model ||
  "mistral-ocr-2512";

/**
 * Process a document using Mistral OCR
 *
 * @param documentUrl - URL of the document to process
 * @param options - Additional options
 * @returns MistralOCRResponse with pages, images, and OCR content
 */
export async function processDocument(
  documentUrl: string,
  options: {
    includeImages?: boolean;
    tableFormat?: "markdown" | "html";
    outputFormat?: "markdown" | "html";
    pages?: string;
  } = {},
): Promise<MistralOCRResponse> {
  if (!MISTRAL_API_KEY) {
    throw new Error("MISTRAL_OCR_API_KEY is not configured");
  }

  const requestBody: MistralOCRRequest = {
    model: MISTRAL_MODEL,
    document: {
      type: "document_url",
      document_url: documentUrl,
    },
    include_image_base64: options.includeImages ?? true,
    table_format: options.tableFormat ?? "markdown",
    output_format: options.outputFormat,
  };

  if (options.pages) {
    requestBody.pages = options.pages;
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral OCR failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Check if Mistral OCR is configured
 */
export function isMistralConfigured(): boolean {
  return !!MISTRAL_API_KEY;
}

/**
 * Get Mistral OCR configuration status
 */
export function getMistralConfig(): {
  configured: boolean;
  model: string;
} {
  return {
    configured: !!MISTRAL_API_KEY,
    model: MISTRAL_MODEL,
  };
}
