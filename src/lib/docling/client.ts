/**
 * Docling Client
 *
 * Client for calling docling-serve API
 */

import type { DoclingDocument, DoclingConvertOptions } from "./types";

const DOCLING_URL = process.env.DOCLING_URL || "http://localhost:5001";

/** Check if docling-serve is available */
export async function checkDoclingAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${DOCLING_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Get docling-serve info */
export async function getDoclingInfo(): Promise<{
  version: string;
  models: string[];
} | null> {
  try {
    const response = await fetch(`${DOCLING_URL}/info`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert a PDF file using docling-serve
 *
 * @param pdfBuffer - PDF file as Buffer or ArrayBuffer
 * @param filename - Original filename
 * @param options - Conversion options
 * @returns DoclingDocument with full structure
 */
export async function convertPDF(
  pdfBuffer: ArrayBuffer,
  filename: string = "document.pdf",
  options: DoclingConvertOptions = {},
): Promise<DoclingDocument> {
  const formData = new FormData();

  // Create blob from buffer
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });
  formData.append("file", blob, filename);

  // Add options as query params
  const params = new URLSearchParams();
  if (options.format) params.set("format", options.format);
  if (options.ocr !== undefined) params.set("ocr", String(options.ocr));
  if (options.tables !== undefined)
    params.set("tables", String(options.tables));

  const url = `${DOCLING_URL}/v1/convert${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Docling conversion failed: ${response.status} - ${errorText}`,
    );
  }

  const result = await response.json();
  return result.document || result;
}

/**
 * Convert a PDF from URL
 */
export async function convertPDFFromURL(
  pdfUrl: string,
  options: DoclingConvertOptions = {},
): Promise<DoclingDocument> {
  // Fetch the PDF first
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const filename = pdfUrl.split("/").pop() || "document.pdf";

  return convertPDF(buffer, filename, options);
}

/**
 * Convert PDF and get markdown output
 */
export async function convertPDFToMarkdown(
  pdfBuffer: ArrayBuffer,
  filename: string = "document.pdf",
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });
  formData.append("file", blob, filename);

  const response = await fetch(`${DOCLING_URL}/v1/convert?format=markdown`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Docling conversion failed: ${response.status} - ${errorText}`,
    );
  }

  const result = await response.json();
  return result.markdown || result.document?.export_to_markdown?.() || "";
}

/** Create a configured Docling client */
export function createDoclingClient(baseUrl?: string) {
  const url = baseUrl || DOCLING_URL;

  return {
    checkAvailable: () =>
      fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
        .then((r) => r.ok)
        .catch(() => false),

    convert: (
      pdfBuffer: ArrayBuffer,
      filename?: string,
      options?: DoclingConvertOptions,
    ) => convertPDF(pdfBuffer, filename, options),

    convertFromURL: (pdfUrl: string, options?: DoclingConvertOptions) =>
      convertPDFFromURL(pdfUrl, options),

    toMarkdown: (pdfBuffer: ArrayBuffer, filename?: string) =>
      convertPDFToMarkdown(pdfBuffer, filename),
  };
}

export type DoclingClient = ReturnType<typeof createDoclingClient>;
