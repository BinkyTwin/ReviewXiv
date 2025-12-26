/**
 * OCR Module
 *
 * Text extraction from PDF pages using OCR LLM (olmOCR via LMStudio)
 */

// Types
export type {
  TextBlock,
  PageLayout,
  OlmOCRRequest,
  OlmOCRResponse,
  OCRStatus,
  TextBlockHighlight,
  TextSelection,
} from "./types";

// olmOCR Client
export {
  checkLMStudioAvailable,
  getAvailableModels,
  extractTextWithOlmOCR,
  extractTextFromPages,
  createOlmOCRClient,
  type OlmOCRClient,
} from "./olmocr-client";

// Page to Image
export {
  renderPageToImage,
  renderPagesToImages,
  renderAllPagesToImages,
  extractBase64Data,
  estimateMemoryUsage,
  recommendBatchSize,
  type PageImageResult,
} from "./page-to-image";

// Layout Parser
export {
  parseMarkdownToBlocks,
  detectColumns,
  applyColumnLayout,
  parseOCRToPageLayout,
  mergeAdjacentBlocks,
  extractPlainText,
  findBlockAtOffset,
  resetBlockIdCounter,
} from "./layout-parser";
