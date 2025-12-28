"use client";

import { memo, useCallback, useRef, useEffect } from "react";
import type { TextItem } from "@/types/pdf";

export interface PDFTextLayerProps {
  /** Text items with normalized positions (0-1) */
  textItems: TextItem[];
  /** Container width in pixels */
  width: number;
  /** Container height in pixels */
  height: number;
  /** Page number */
  pageNumber: number;
  /** Callback when text is selected */
  onTextSelect?: (selection: TextSelectionData | null) => void;
}

export interface TextSelectionData {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  position: { x: number; y: number };
  rects: NormalizedRect[];
}

interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * PDFTextLayer - Renders selectable text spans positioned over the canvas
 * Uses TextItem positions from PDF.js extraction
 */
export const PDFTextLayer = memo(function PDFTextLayer({
  textItems,
  width,
  height,
  pageNumber,
  onTextSelect,
}: PDFTextLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (!onTextSelect || !layerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onTextSelect(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Find start/end offsets from span data attributes
    const startSpan =
      startContainer instanceof HTMLElement
        ? startContainer
        : startContainer.parentElement;
    const endSpan =
      endContainer instanceof HTMLElement
        ? endContainer
        : endContainer.parentElement;

    if (!startSpan?.dataset.startOffset || !endSpan?.dataset.startOffset) {
      return;
    }

    const startOffset =
      parseInt(startSpan.dataset.startOffset, 10) + range.startOffset;
    const endOffset =
      parseInt(endSpan.dataset.startOffset, 10) + range.endOffset;

    // Calculate normalized rects
    const rects = getSelectionRects(range, layerRef.current, width, height);

    // Get selection position for popover
    const rect = range.getBoundingClientRect();

    onTextSelect({
      pageNumber,
      startOffset,
      endOffset,
      selectedText,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
      rects,
    });
  }, [pageNumber, width, height, onTextSelect]);

  // Attach mouseup listener
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.addEventListener("mouseup", handleMouseUp);
    return () => layer.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 overflow-hidden select-text"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        userSelect: "text",
        pointerEvents: "auto",
      }}
    >
      {textItems.map((item, index) => {
        // Convert normalized coordinates to pixels
        const left = item.x * width;
        const top = item.y * height;
        const itemWidth = item.width * width;
        const itemHeight = item.height * height;

        return (
          <span
            key={`${pageNumber}-${index}-${item.startOffset}`}
            data-start-offset={item.startOffset}
            data-end-offset={item.endOffset}
            style={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              width: `${itemWidth}px`,
              height: `${itemHeight}px`,
              fontSize: `${itemHeight * 0.9}px`,
              lineHeight: 1,
              whiteSpace: "pre",
              transformOrigin: "left top",
              color: "transparent",
              pointerEvents: "auto",
            }}
          >
            {item.str}
          </span>
        );
      })}
    </div>
  );
});

/**
 * Get normalized selection rects relative to the layer container
 */
function getSelectionRects(
  range: Range,
  container: HTMLDivElement,
  width: number,
  height: number,
): NormalizedRect[] {
  const containerRect = container.getBoundingClientRect();

  const clientRects = Array.from(range.getClientRects());
  const rects: NormalizedRect[] = [];

  for (const rect of clientRects) {
    // Skip rects outside the container
    if (
      rect.right <= containerRect.left ||
      rect.left >= containerRect.right ||
      rect.bottom <= containerRect.top ||
      rect.top >= containerRect.bottom
    ) {
      continue;
    }

    // Clip to container bounds
    const left = Math.max(rect.left, containerRect.left);
    const right = Math.min(rect.right, containerRect.right);
    const top = Math.max(rect.top, containerRect.top);
    const bottom = Math.min(rect.bottom, containerRect.bottom);

    if (right <= left || bottom <= top) continue;

    // Normalize to 0-1 range
    rects.push({
      x: (left - containerRect.left) / width,
      y: (top - containerRect.top) / height,
      width: (right - left) / width,
      height: (bottom - top) / height,
    });
  }

  // Merge adjacent rects on the same line
  return mergeRects(rects);
}

/**
 * Merge adjacent rects on the same line
 */
function mergeRects(rects: NormalizedRect[]): NormalizedRect[] {
  if (rects.length === 0) return [];

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: NormalizedRect[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const sameLine = Math.abs(next.y - current.y) < 0.01;
    const adjacent = next.x <= current.x + current.width + 0.01;

    if (sameLine && adjacent) {
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

export default PDFTextLayer;
