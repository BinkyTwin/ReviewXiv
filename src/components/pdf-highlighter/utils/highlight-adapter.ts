import type { ScaledPosition, Content } from "react-pdf-highlighter-extended";
import type {
  Highlight,
  HighlightColor,
  CreateHighlightRequest,
} from "@/types/highlight";
import type {
  DeepReadHighlight,
  PageDimensions,
  PageDimensionsMap,
} from "../types";
import {
  rectsToScaledPosition,
  scaledPositionToRects,
} from "./position-converter";

/**
 * Converts a Supabase Highlight to react-pdf-highlighter-extended format
 */
export function supabaseToRphHighlight(
  highlight: Highlight,
  dimensions: PageDimensions,
): DeepReadHighlight {
  const position = rectsToScaledPosition(
    highlight.rects,
    highlight.pageNumber,
    dimensions,
  );

  return {
    id: highlight.id,
    position,
    content: { text: highlight.selectedText },
    color: highlight.color,
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    note: highlight.note,
    paperId: highlight.paperId,
    createdAt: highlight.createdAt,
    updatedAt: highlight.updatedAt,
  };
}

/**
 * Converts multiple Supabase Highlights to react-pdf-highlighter-extended format
 */
export function supabaseHighlightsToRph(
  highlights: Highlight[],
  dimensionsMap: PageDimensionsMap,
): DeepReadHighlight[] {
  return highlights
    .filter((h) => dimensionsMap.has(h.pageNumber))
    .map((h) => supabaseToRphHighlight(h, dimensionsMap.get(h.pageNumber)!));
}

/**
 * Converts react-pdf-highlighter-extended data to Supabase CreateHighlightRequest
 */
export function rphToCreateHighlightRequest(
  position: ScaledPosition,
  content: Content,
  color: HighlightColor,
  paperId: string,
  dimensions: PageDimensions,
): CreateHighlightRequest {
  const rects = scaledPositionToRects(position, dimensions);

  return {
    paperId,
    pageNumber: position.boundingRect.pageNumber,
    startOffset: 0, // Not available from react-pdf-highlighter-extended
    endOffset: 0, // Not available from react-pdf-highlighter-extended
    selectedText: content.text || "",
    rects,
    color,
  };
}

/**
 * Finds the original Supabase Highlight from a DeepReadHighlight ID
 */
export function findOriginalHighlight(
  id: string,
  highlights: Highlight[],
): Highlight | undefined {
  return highlights.find((h) => h.id === id);
}

/**
 * Generates a unique ID for a new highlight
 */
export function generateHighlightId(): string {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if two highlights overlap
 */
export function highlightsOverlap(
  h1: DeepReadHighlight,
  h2: DeepReadHighlight,
): boolean {
  if (
    h1.position.boundingRect.pageNumber !== h2.position.boundingRect.pageNumber
  )
    return false;

  const b1 = h1.position.boundingRect;
  const b2 = h2.position.boundingRect;

  return !(b1.x2 < b2.x1 || b2.x2 < b1.x1 || b1.y2 < b2.y1 || b2.y2 < b1.y1);
}
