import type { TextItem, HighlightRect } from "@/types/pdf";
import type { PdfCitation } from "@/types/citation";

/**
 * Convert citation offsets to visual rectangles
 * Uses text items to map character positions to screen coordinates
 */
export function offsetsToRects(
  citation: PdfCitation,
  textItems: TextItem[],
): HighlightRect[] {
  const rects: HighlightRect[] = [];

  for (const item of textItems) {
    // Check if this text item overlaps with the citation range
    if (item.endOffset <= citation.start || item.startOffset >= citation.end) {
      continue; // No overlap
    }

    // Calculate the portion of this item that is highlighted
    const overlapStart = Math.max(item.startOffset, citation.start);
    const overlapEnd = Math.min(item.endOffset, citation.end);

    const itemLength = item.endOffset - item.startOffset;
    const overlapLength = overlapEnd - overlapStart;

    if (itemLength > 0 && overlapLength > 0) {
      const startRatio = (overlapStart - item.startOffset) / itemLength;
      const widthRatio = overlapLength / itemLength;

      rects.push({
        x: item.x + item.width * startRatio,
        y: item.y,
        width: item.width * widthRatio,
        height: item.height,
      });
    }
  }

  return mergeAdjacentRects(rects);
}

/**
 * Merge rectangles that are on the same line
 * This reduces the number of DOM elements and improves visual appearance
 */
function mergeAdjacentRects(rects: HighlightRect[]): HighlightRect[] {
  if (rects.length === 0) return [];

  // Sort by Y position, then X position
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: HighlightRect[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Same line (Y within tolerance) and adjacent or overlapping
    const sameLine = Math.abs(next.y - current.y) < 0.01;
    const adjacent = next.x <= current.x + current.width + 0.02;

    if (sameLine && adjacent) {
      // Merge: extend current to include next
      current = {
        x: current.x,
        y: current.y,
        width:
          Math.max(current.x + current.width, next.x + next.width) - current.x,
        height: Math.max(current.height, next.height),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Find text items that match a given text string
 * Used for finding citation positions when offsets are not exact
 */
export function findTextInItems(
  searchText: string,
  textItems: TextItem[],
): { startOffset: number; endOffset: number } | null {
  // Build full text from items
  let fullText = "";
  for (const item of textItems) {
    fullText += item.str;
    if (!item.str.endsWith(" ") && !item.str.endsWith("\n")) {
      fullText += " ";
    }
  }

  // Normalize both texts for comparison
  const normalizedSearch = normalizeText(searchText);
  const normalizedFull = normalizeText(fullText);

  const index = normalizedFull.indexOf(normalizedSearch);
  if (index === -1) return null;

  // Map back to original offsets (approximate)
  return {
    startOffset: index,
    endOffset: index + searchText.length,
  };
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
