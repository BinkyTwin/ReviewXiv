/**
 * Types for Smart PDF Viewer OCR system
 */

/**
 * Text block extracted from OCR
 */
export interface TextBlock {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "list"
    | "list-item"
    | "table"
    | "caption"
    | "equation"
    | "footnote";
  level?: number; // For headings (1-6)
  content: string;
  /** Normalized position (0-1 range) relative to page dimensions */
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Optional: column index for multi-column layouts */
  column?: number;
  /** Translation state */
  translation?: string;
  isTranslated?: boolean;
}

/**
 * Layout information for a page
 */
export interface PageLayout {
  pageNumber: number;
  width: number;
  height: number;
  columns: number; // Number of columns detected (1 = single column)
  blocks: TextBlock[];
  /** Raw markdown from OCR */
  rawMarkdown: string;
}

/**
 * Processing status for a document
 */
export interface OCRStatus {
  paperId: string;
  totalPages: number;
  processedPages: number;
  currentPage: number;
  status: "idle" | "processing" | "completed" | "error";
  error?: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Highlight on a text block
 */
export interface TextBlockHighlight {
  id: string;
  blockId: string;
  /** Character range within the block content */
  startOffset: number;
  endOffset: number;
  color: "yellow" | "green" | "blue" | "red" | "purple";
  note?: string;
}

/**
 * Selection state for text interactions
 */
export interface TextSelection {
  blockIds: string[];
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  selectedText: string;
  /** Screen position for toolbar */
  position: {
    x: number;
    y: number;
  };
}
