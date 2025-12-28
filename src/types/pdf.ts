/**
 * Represents a single text item extracted from a PDF page
 * Coordinates are normalized to 0-1 range for viewport-independent rendering
 */
export interface TextItem {
  /** The text content of this item */
  str: string;
  /** Normalized X position (0-1, from left) */
  x: number;
  /** Normalized Y position (0-1, from top) */
  y: number;
  /** Normalized width (0-1) */
  width: number;
  /** Normalized height (0-1) */
  height: number;
  /** Character offset start in page's textContent */
  startOffset: number;
  /** Character offset end in page's textContent */
  endOffset: number;
}

/**
 * Represents extracted data from a single PDF page
 */
export interface PageData {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Full concatenated text content of the page */
  textContent: string;
  /** Individual text items with positions */
  textItems: TextItem[];
  /** Original page width in PDF points */
  width: number;
  /** Original page height in PDF points */
  height: number;
  /** Whether the page has extractable text (false = needs OCR) */
  hasText: boolean;
}

/**
 * Normalized rectangle for highlighting
 */
export interface HighlightRect {
  /** Normalized X position (0-1) */
  x: number;
  /** Normalized Y position (0-1) */
  y: number;
  /** Normalized width (0-1) */
  width: number;
  /** Normalized height (0-1) */
  height: number;
}
