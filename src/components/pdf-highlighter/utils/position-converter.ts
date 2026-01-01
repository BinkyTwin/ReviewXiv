import type { ScaledPosition, Scaled } from "react-pdf-highlighter-extended";
import type { HighlightRect } from "@/types/highlight";
import type { PageDimensions } from "../types";

/**
 * Converts ScaledPosition (react-pdf-highlighter) to HighlightRect[] (ReviewXiv)
 *
 * react-pdf-highlighter uses absolute coordinates (x1, y1, x2, y2) in pixels
 * ReviewXiv uses relative coordinates (x, y, width, height) as 0-1 percentages
 */
export function scaledPositionToRects(
  position: ScaledPosition,
  dimensions: PageDimensions,
): HighlightRect[] {
  const { width: pageWidth, height: pageHeight } = dimensions;

  return position.rects.map((rect) => ({
    x: rect.x1 / pageWidth,
    y: rect.y1 / pageHeight,
    width: rect.width / pageWidth,
    height: rect.height / pageHeight,
  }));
}

/**
 * Converts HighlightRect[] (ReviewXiv) to ScaledPosition (react-pdf-highlighter)
 */
export function rectsToScaledPosition(
  rects: HighlightRect[],
  pageNumber: number,
  dimensions: PageDimensions,
): ScaledPosition {
  const { width: pageWidth, height: pageHeight } = dimensions;

  const scaledRects: Scaled[] = rects.map((rect) => ({
    x1: rect.x * pageWidth,
    y1: rect.y * pageHeight,
    x2: (rect.x + rect.width) * pageWidth,
    y2: (rect.y + rect.height) * pageHeight,
    width: rect.width * pageWidth,
    height: rect.height * pageHeight,
    pageNumber,
  }));

  // Calculate bounding rect that encompasses all rects
  const boundingRect: Scaled = {
    x1: Math.min(...scaledRects.map((r) => r.x1)),
    y1: Math.min(...scaledRects.map((r) => r.y1)),
    x2: Math.max(...scaledRects.map((r) => r.x2)),
    y2: Math.max(...scaledRects.map((r) => r.y2)),
    width: 0,
    height: 0,
    pageNumber,
  };
  boundingRect.width = boundingRect.x2 - boundingRect.x1;
  boundingRect.height = boundingRect.y2 - boundingRect.y1;

  return {
    boundingRect,
    rects: scaledRects,
  };
}

/**
 * Merges adjacent rects on the same line to reduce DOM elements
 * @param rects Array of rects to merge
 * @param yTolerance Y-axis tolerance for considering rects on the same line (0-1)
 */
export function mergeAdjacentRects(
  rects: HighlightRect[],
  yTolerance = 0.01,
): HighlightRect[] {
  if (rects.length === 0) return [];

  // Sort by y, then by x
  const sorted = [...rects].sort((a, b) => {
    const yDiff = a.y - b.y;
    return Math.abs(yDiff) < yTolerance ? a.x - b.x : yDiff;
  });

  const merged: HighlightRect[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const sameRow = Math.abs(next.y - current.y) < yTolerance;
    const adjacent = Math.abs(next.x - (current.x + current.width)) < 0.02;

    if (sameRow && adjacent) {
      // Merge: extend current rect to include next
      const newWidth = next.x + next.width - current.x;
      current.width = Math.max(current.width, newWidth);
      current.height = Math.max(current.height, next.height);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Calculates the center point of a ScaledPosition (for popup positioning)
 */
export function getPositionCenter(position: ScaledPosition): {
  x: number;
  y: number;
} {
  const { boundingRect } = position;
  return {
    x: boundingRect.x1 + boundingRect.width / 2,
    y: boundingRect.y1,
  };
}
