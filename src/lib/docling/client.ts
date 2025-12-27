/**
 * Docling Client
 *
 * Client for calling docling-serve API
 */

import type { DoclingDocument, DoclingConvertOptions } from "./types";

const DOCLING_URL = process.env.DOCLING_URL || "http://localhost:5001";
const DOCLING_OCR_DEFAULT = (() => {
  const envValue = process.env.DOCLING_OCR;
  if (!envValue) return undefined;
  if (envValue.toLowerCase() === "true") return true;
  if (envValue.toLowerCase() === "false") return false;
  return undefined;
})();

function buildConvertFormData(
  pdfBuffer: ArrayBuffer,
  filename: string,
  options: DoclingConvertOptions,
  toFormat: "json" | "md",
): FormData {
  const formData = new FormData();

  // Create blob from buffer - use 'files' field name as per docling-serve API
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });
  formData.append("files", blob, filename);

  // Add options as form fields (not query params)
  formData.append("to_formats", toFormat);
  formData.append("from_formats", "pdf");

  const ocrValue = options.ocr ?? DOCLING_OCR_DEFAULT;
  if (ocrValue !== undefined) {
    formData.append("do_ocr", String(ocrValue));
  }

  return formData;
}

function extractDoclingDocument(result: unknown): DoclingDocument {
  if (!result || typeof result !== "object") {
    throw new Error("Docling response is empty or invalid.");
  }

  const root = result as Record<string, unknown>;
  let candidate =
    (root.document as unknown) ??
    (root.documents as unknown) ??
    (root.json_content as unknown) ??
    root;

  if (Array.isArray(candidate)) {
    candidate = candidate[0];
  }

  if (candidate && typeof candidate === "object") {
    const candidateRecord = candidate as Record<string, unknown>;
    if (candidateRecord.json_content && typeof candidateRecord.json_content === "object") {
      return candidateRecord.json_content as DoclingDocument;
    }

    if (candidateRecord.pages && typeof candidateRecord.pages === "object") {
      return candidateRecord as DoclingDocument;
    }
  }

  throw new Error(
    "Docling response missing json_content. Ensure to_formats includes json.",
  );
}

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
  const url = `${DOCLING_URL}/v1/convert/file`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: buildConvertFormData(pdfBuffer, filename, options, "json"),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Docling conversion failed: ${response.status} - ${errorText}`,
    );
  }

  const result = await response.json();
  return extractDoclingDocument(result);
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
  const response = await fetch(`${DOCLING_URL}/v1/convert/file`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: buildConvertFormData(pdfBuffer, filename, {}, "md"),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Docling conversion failed: ${response.status} - ${errorText}`,
    );
  }

  const result = await response.json();
  // Extract markdown from response
  const docs = result.document || result.documents || [];
  const doc = Array.isArray(docs) ? docs[0] : docs;
  return doc?.md_content || doc?.markdown || "";
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
