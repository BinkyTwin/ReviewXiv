/**
 * Represents a citation from the LLM response
 */
export interface PdfCitation {
  format?: "pdf";
  /** Page number (1-indexed) */
  page: number;
  /** Character offset start in page's text_content */
  start: number;
  /** Character offset end in page's text_content */
  end: number;
  /** Quoted text for verification (max 100 chars) */
  quote: string;
  /** Whether the citation has been validated against actual text */
  verified?: boolean;
}

export interface HtmlCitation {
  format: "html";
  /** Section ID from HTML */
  sectionId: string;
  /** Character offset start in section's text_content */
  start: number;
  /** Character offset end in section's text_content */
  end: number;
  /** Quoted text for verification (max 100 chars) */
  quote: string;
  /** Whether the citation has been validated against actual text */
  verified?: boolean;
}

export type Citation = PdfCitation | HtmlCitation;

/**
 * LLM response format with citations
 */
export interface CitedResponse {
  /** The main answer text */
  answer: string;
  /** Array of citations supporting the answer */
  citations: Citation[];
}

/**
 * Result of validating a citation
 */
export interface CitationValidationResult {
  /** Whether the citation is valid */
  isValid: boolean;
  /** Corrected citation if the original was close but not exact */
  correctedCitation?: Citation;
  /** Error message if validation failed */
  error?: string;
}
