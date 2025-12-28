/**
 * Represents a citation from the LLM response
 * Citations link specific text passages to their source in the PDF
 */
export interface Citation {
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
