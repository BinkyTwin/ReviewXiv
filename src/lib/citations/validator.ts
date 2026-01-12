import type {
  Citation,
  CitationValidationResult,
  HtmlCitation,
  PdfCitation,
} from "@/types/citation";

interface PageText {
  pageNumber: number;
  textContent: string;
}

interface SectionText {
  sectionId: string;
  textContent: string;
}

/**
 * Validate a citation against actual page text
 * Returns whether the citation is valid and optionally a corrected version
 */
export function validateCitation(
  citation: Citation,
  pages: PageText[],
  sections?: SectionText[],
): CitationValidationResult {
  if (citation.format === "html" || "sectionId" in citation) {
    if (!sections || sections.length === 0) {
      return { isValid: false, error: "Section context not provided" };
    }
    return validateHtmlCitation(citation as HtmlCitation, sections);
  }

  return validatePdfCitation(citation as PdfCitation, pages);
}

/**
 * Validate multiple citations
 */
export function validateCitations(
  citations: Citation[],
  pages: PageText[],
  sections?: SectionText[],
): Citation[] {
  const validated: Citation[] = [];

  for (const citation of citations) {
    const result = validateCitation(citation, pages, sections);
    if (result.isValid) {
      validated.push(result.correctedCitation || citation);
    }
  }

  return validated;
}

/**
 * Validate PDF citation against page text
 */
function validatePdfCitation(
  citation: PdfCitation,
  pages: PageText[],
): CitationValidationResult {
  const page = pages.find((p) => p.pageNumber === citation.page);
  if (!page) {
    return { isValid: false, error: `Page ${citation.page} not found` };
  }

  return validateOffsets({
    text: page.textContent,
    start: citation.start,
    end: citation.end,
    quote: citation.quote,
    buildCitation: (start, end, quote) => ({
      ...citation,
      start,
      end,
      quote,
      verified: true,
    }),
  });
}

/**
 * Validate HTML citation against section text
 */
function validateHtmlCitation(
  citation: HtmlCitation,
  sections: SectionText[],
): CitationValidationResult {
  const section = sections.find((s) => s.sectionId === citation.sectionId);
  if (!section) {
    return {
      isValid: false,
      error: `Section ${citation.sectionId} not found`,
    };
  }

  return validateOffsets({
    text: section.textContent,
    start: citation.start,
    end: citation.end,
    quote: citation.quote,
    buildCitation: (start, end, quote) => ({
      ...citation,
      start,
      end,
      quote,
      verified: true,
    }),
  });
}

interface OffsetValidationInput {
  text: string;
  start: number;
  end: number;
  quote: string;
  buildCitation: (start: number, end: number, quote: string) => Citation;
}

function validateOffsets({
  text,
  start,
  end,
  quote,
  buildCitation,
}: OffsetValidationInput): CitationValidationResult {
  if (start < 0 || end > text.length || start >= end) {
    if (quote) {
      const corrected = findQuoteInText(quote, text, buildCitation);
      if (corrected) {
        return { isValid: true, correctedCitation: corrected };
      }
    }
    return { isValid: false, error: "Invalid offsets" };
  }

  const actualText = text.slice(start, end);

  if (quote) {
    const similarity = calculateSimilarity(
      normalizeText(quote),
      normalizeText(actualText),
    );

    if (similarity > 0.7) {
      return { isValid: true };
    }

    const corrected = findQuoteInText(quote, text, buildCitation);
    if (corrected) {
      return { isValid: true, correctedCitation: corrected };
    }
  }

  if (!quote && actualText.length > 0) {
    return { isValid: true };
  }

  return { isValid: false, error: "Quote does not match text at offsets" };
}

/**
 * Find a quote in the text and return corrected citation
 */
function findQuoteInText(
  quote: string,
  text: string,
  buildCitation: (start: number, end: number, quote: string) => Citation,
): Citation | null {
  const normalizedQuote = normalizeText(quote);
  const normalizedText = normalizeText(text);

  let index = normalizedText.indexOf(normalizedQuote);

  if (index === -1) {
    const words = normalizedQuote.split(" ");
    if (words.length >= 3) {
      const shortQuote = words.slice(0, 5).join(" ");
      index = normalizedText.indexOf(shortQuote);
    }
  }

  if (index === -1) {
    return null;
  }

  const start = index;
  const end = Math.min(start + quote.length, text.length);

  return buildCitation(
    start,
    end,
    text.slice(start, Math.min(start + 100, end)),
  );
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
