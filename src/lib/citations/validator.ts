import type { Citation, CitationValidationResult } from "@/types/citation";

interface PageText {
  pageNumber: number;
  textContent: string;
}

/**
 * Validate a citation against actual page text
 * Returns whether the citation is valid and optionally a corrected version
 */
export function validateCitation(
  citation: Citation,
  pages: PageText[],
): CitationValidationResult {
  // Find the page
  const page = pages.find((p) => p.pageNumber === citation.page);
  if (!page) {
    return {
      isValid: false,
      error: `Page ${citation.page} not found`,
    };
  }

  const text = page.textContent;

  // Check bounds
  if (
    citation.start < 0 ||
    citation.end > text.length ||
    citation.start >= citation.end
  ) {
    // Try to find the quote in the text
    if (citation.quote) {
      const corrected = findQuoteInText(citation.quote, text, citation.page);
      if (corrected) {
        return { isValid: true, correctedCitation: corrected };
      }
    }
    return {
      isValid: false,
      error: "Invalid offsets",
    };
  }

  // Extract actual text at these offsets
  const actualText = text.slice(citation.start, citation.end);

  // Verify the quote matches (with some tolerance)
  if (citation.quote) {
    const similarity = calculateSimilarity(
      normalizeText(citation.quote),
      normalizeText(actualText),
    );

    if (similarity > 0.7) {
      return { isValid: true };
    }

    // Try to find the quote elsewhere in the page
    const corrected = findQuoteInText(citation.quote, text, citation.page);
    if (corrected) {
      return { isValid: true, correctedCitation: corrected };
    }
  }

  // If no quote provided but offsets are valid, accept it
  if (!citation.quote && actualText.length > 0) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: "Quote does not match text at offsets",
  };
}

/**
 * Validate multiple citations
 */
export function validateCitations(
  citations: Citation[],
  pages: PageText[],
): Citation[] {
  const validated: Citation[] = [];

  for (const citation of citations) {
    const result = validateCitation(citation, pages);
    if (result.isValid) {
      validated.push(result.correctedCitation || citation);
    }
  }

  return validated;
}

/**
 * Find a quote in the page text and return corrected citation
 */
function findQuoteInText(
  quote: string,
  text: string,
  page: number,
): Citation | null {
  const normalizedQuote = normalizeText(quote);
  const normalizedText = normalizeText(text);

  // Try exact match first
  let index = normalizedText.indexOf(normalizedQuote);

  if (index === -1) {
    // Try finding a shorter substring
    const words = normalizedQuote.split(" ");
    if (words.length >= 3) {
      const shortQuote = words.slice(0, 5).join(" ");
      index = normalizedText.indexOf(shortQuote);
    }
  }

  if (index === -1) {
    return null;
  }

  // Map normalized index back to original text (approximate)
  // This is a simplification - in production, use proper mapping
  const start = index;
  const end = Math.min(start + quote.length, text.length);

  return {
    page,
    start,
    end,
    quote: text.slice(start, Math.min(start + 100, end)),
    verified: true,
  };
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  // Simple containment check
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Levenshtein distance-based similarity
  const distance = levenshteinDistance(shorter, longer);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
