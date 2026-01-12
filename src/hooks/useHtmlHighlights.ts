"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { HtmlHighlight, HighlightColor } from "@/types/highlight";
import { createRangeFromOffsets } from "@/lib/html/selection";

export interface HtmlHighlightBox {
  id: string;
  highlight: HtmlHighlight;
  color: HighlightColor;
  rect: { left: number; top: number; width: number; height: number };
}

interface UseHtmlHighlightsOptions {
  highlights: HtmlHighlight[];
  contentRef: React.RefObject<HTMLElement | null>;
}

export function useHtmlHighlights({
  highlights,
  contentRef,
}: UseHtmlHighlightsOptions) {
  const [boxes, setBoxes] = useState<HtmlHighlightBox[]>([]);

  const computeBoxes = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const nextBoxes: HtmlHighlightBox[] = [];

    for (const highlight of highlights) {
      const sectionElement = container.querySelector(
        `[data-section-id="${CSS.escape(highlight.sectionId)}"]`,
      );
      if (!sectionElement || !(sectionElement instanceof HTMLElement)) {
        continue;
      }

      const range = createRangeFromOffsets(
        sectionElement,
        highlight.startOffset,
        highlight.endOffset,
      );

      if (!range) continue;

      const rects = Array.from(range.getClientRects());
      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue;

        nextBoxes.push({
          id: highlight.id,
          highlight,
          color: highlight.color,
          rect: {
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }

    setBoxes(nextBoxes);
  }, [contentRef, highlights]);

  useLayoutEffect(() => {
    const raf = window.requestAnimationFrame(() => computeBoxes());
    return () => window.cancelAnimationFrame(raf);
  }, [computeBoxes]);

  useEffect(() => {
    const handleResize = () => computeBoxes();
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (contentRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => computeBoxes());
      observer.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [computeBoxes, contentRef]);

  return { boxes, recompute: computeBoxes };
}
