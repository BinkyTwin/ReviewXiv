// Use pdfjs-dist legacy build for Node.js (server-side)
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem, PageData } from "@/types/pdf";

interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName: string;
}

/**
 * Extract text data from a single PDF page
 * Coordinates are normalized to 0-1 for viewport-independent rendering
 */
export async function extractPageData(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<PageData> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();

  let currentOffset = 0;
  const textItems: TextItem[] = [];
  let fullText = "";

  for (const item of textContent.items) {
    // Type guard for text items (vs marked content)
    if (!("str" in item)) continue;

    const pdfItem = item as PDFTextItem;
    const str = pdfItem.str;

    if (!str) continue;

    // Normalize coordinates to 0-1 range
    // PDF origin is bottom-left, we convert to top-left
    const x = pdfItem.transform[4] / viewport.width;
    const y = 1 - pdfItem.transform[5] / viewport.height;
    const width = (pdfItem.width || 0) / viewport.width;
    const height = (pdfItem.height || 0) / viewport.height;

    const startOffset = currentOffset;
    fullText += str;
    currentOffset += str.length;
    const endOffset = currentOffset;

    textItems.push({
      str,
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      width: Math.max(0, width),
      height: Math.max(0, height),
      startOffset,
      endOffset,
    });

    // Add space between items if the text doesn't end with whitespace
    if (!str.endsWith(" ") && !str.endsWith("\n")) {
      fullText += " ";
      currentOffset += 1;
    }
  }

  return {
    pageNumber: pageNum,
    textContent: fullText.trim(),
    textItems,
    width: viewport.width,
    height: viewport.height,
    hasText: textItems.length > 0 && fullText.trim().length > 50,
  };
}

/**
 * Extract all pages from a PDF buffer
 */
export async function extractAllPages(
  pdfBuffer: ArrayBuffer,
): Promise<PageData[]> {
  const pdfDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableWorker: true,
  }).promise;

  const pages: PageData[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageData = await extractPageData(pdfDoc, i);
    pages.push(pageData);
  }

  await pdfDoc.destroy();

  return pages;
}

/**
 * Chunk page content into smaller pieces for RAG
 */
export function chunkPageContent(
  textContent: string,
  chunkSize: number = 500,
  overlap: number = 50,
): Array<{ content: string; startOffset: number; endOffset: number }> {
  const chunks: Array<{
    content: string;
    startOffset: number;
    endOffset: number;
  }> = [];

  if (!textContent || textContent.length === 0) {
    return chunks;
  }

  let start = 0;

  while (start < textContent.length) {
    const end = Math.min(start + chunkSize, textContent.length);
    const content = textContent.slice(start, end);

    chunks.push({
      content,
      startOffset: start,
      endOffset: end,
    });

    // Move start forward, accounting for overlap
    start = end - overlap;

    // Avoid infinite loop if overlap >= chunkSize
    if (start >= textContent.length - overlap) {
      break;
    }
  }

  return chunks;
}
