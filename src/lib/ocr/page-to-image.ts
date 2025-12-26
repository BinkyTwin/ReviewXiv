/**
 * PDF Page to Image Converter
 *
 * Converts PDF pages to base64 images for OCR processing
 * Uses PDF.js to render pages to canvas, then exports as PNG
 *
 * @note olmOCR expects the longest dimension to be 1024px
 */

// PDF.js types
interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => { promise: Promise<void> };
}

interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

/** Target longest dimension for OCR (olmOCR recommendation) */
const OCR_TARGET_SIZE = 1024;

/** Image quality for PNG export (0-1) */
const IMAGE_QUALITY = 0.92;

export interface PageImageResult {
  pageNumber: number;
  imageBase64: string;
  width: number;
  height: number;
  scale: number;
}

/**
 * Calculate the scale factor to resize the page
 * so that the longest dimension equals target size
 */
function calculateScale(
  originalWidth: number,
  originalHeight: number,
  targetSize: number = OCR_TARGET_SIZE,
): number {
  const longestDimension = Math.max(originalWidth, originalHeight);
  return targetSize / longestDimension;
}

/**
 * Render a single PDF page to base64 PNG
 *
 * @param pdf - PDF.js document proxy
 * @param pageNumber - Page number (1-indexed)
 * @param targetSize - Target size for longest dimension
 * @returns Base64 encoded PNG image
 */
export async function renderPageToImage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  targetSize: number = OCR_TARGET_SIZE,
): Promise<PageImageResult> {
  const page = await pdf.getPage(pageNumber);

  // Get viewport at scale 1 to determine original dimensions
  const baseViewport = page.getViewport({ scale: 1 });

  // Calculate scale for target size
  const scale = calculateScale(
    baseViewport.width,
    baseViewport.height,
    targetSize,
  );
  const viewport = page.getViewport({ scale });

  // Create canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Account for device pixel ratio for crisp rendering
  const pixelRatio =
    typeof window !== "undefined" ? window.devicePixelRatio : 1;
  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  // Scale context for HiDPI
  context.scale(pixelRatio, pixelRatio);

  // White background (important for OCR)
  context.fillStyle = "white";
  context.fillRect(0, 0, viewport.width, viewport.height);

  // Render the PDF page
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  // Export to base64 PNG
  const imageBase64 = canvas.toDataURL("image/png", IMAGE_QUALITY);

  // Clean up
  canvas.width = 0;
  canvas.height = 0;

  return {
    pageNumber,
    imageBase64,
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height),
    scale,
  };
}

/**
 * Render multiple pages to images
 *
 * @param pdf - PDF.js document proxy
 * @param pageNumbers - Array of page numbers to render (1-indexed)
 * @param targetSize - Target size for longest dimension
 * @param onProgress - Progress callback
 * @returns Array of page image results
 */
export async function renderPagesToImages(
  pdf: PDFDocumentProxy,
  pageNumbers: number[],
  targetSize: number = OCR_TARGET_SIZE,
  onProgress?: (current: number, total: number) => void,
): Promise<PageImageResult[]> {
  const results: PageImageResult[] = [];

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNumber = pageNumbers[i];

    if (onProgress) {
      onProgress(i + 1, pageNumbers.length);
    }

    const result = await renderPageToImage(pdf, pageNumber, targetSize);
    results.push(result);
  }

  return results;
}

/**
 * Render all pages of a PDF to images
 */
export async function renderAllPagesToImages(
  pdf: PDFDocumentProxy,
  targetSize: number = OCR_TARGET_SIZE,
  onProgress?: (current: number, total: number) => void,
): Promise<PageImageResult[]> {
  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  return renderPagesToImages(pdf, pageNumbers, targetSize, onProgress);
}

/**
 * Extract just the base64 data from a data URL
 * Removes the "data:image/png;base64," prefix
 */
export function extractBase64Data(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

/**
 * Estimate memory usage for rendering pages
 * Useful for deciding batch sizes
 */
export function estimateMemoryUsage(
  pageCount: number,
  targetSize: number = OCR_TARGET_SIZE,
): number {
  // Rough estimate: 4 bytes per pixel (RGBA) * target size^2 per page
  const bytesPerPage = 4 * targetSize * targetSize;
  return pageCount * bytesPerPage;
}

/**
 * Recommend batch size based on available memory
 * Default assumes 512MB available for rendering
 */
export function recommendBatchSize(
  totalPages: number,
  availableMemoryMB: number = 512,
): number {
  const bytesPerPage = estimateMemoryUsage(1);
  const maxPages = Math.floor((availableMemoryMB * 1024 * 1024) / bytesPerPage);
  return Math.min(maxPages, totalPages, 10); // Cap at 10 pages per batch
}
