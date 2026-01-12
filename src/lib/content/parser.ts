export interface TextChunk {
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Chunk text content into smaller pieces for RAG (character-based).
 */
export function chunkTextContent(
  textContent: string,
  chunkSize: number = 500,
  overlap: number = 50,
): TextChunk[] {
  const chunks: TextChunk[] = [];

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

    start = end - overlap;
    if (start >= textContent.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk section content by paragraph boundaries when possible.
 */
export function chunkSectionContent(
  textContent: string,
  maxChunkSize: number = 1200,
): TextChunk[] {
  if (!textContent || textContent.length === 0) {
    return [];
  }

  const paragraphRanges: Array<{ start: number; end: number }> = [];
  const separatorRegex = /\n{2,}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorRegex.exec(textContent)) !== null) {
    const end = match.index;
    if (end > lastIndex) {
      paragraphRanges.push({ start: lastIndex, end });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < textContent.length) {
    paragraphRanges.push({ start: lastIndex, end: textContent.length });
  }

  if (paragraphRanges.length <= 1) {
    return chunkTextContent(textContent, Math.min(800, maxChunkSize), 80);
  }

  const chunks: TextChunk[] = [];
  let chunkStart = paragraphRanges[0].start;
  let chunkEnd = paragraphRanges[0].end;

  for (let i = 1; i < paragraphRanges.length; i += 1) {
    const nextRange = paragraphRanges[i];
    const candidateEnd = nextRange.end;

    if (candidateEnd - chunkStart > maxChunkSize) {
      const content = textContent.slice(chunkStart, chunkEnd);
      chunks.push({
        content,
        startOffset: chunkStart,
        endOffset: chunkEnd,
      });
      chunkStart = nextRange.start;
    }

    chunkEnd = nextRange.end;
  }

  if (chunkEnd > chunkStart) {
    chunks.push({
      content: textContent.slice(chunkStart, chunkEnd),
      startOffset: chunkStart,
      endOffset: chunkEnd,
    });
  }

  return chunks;
}
