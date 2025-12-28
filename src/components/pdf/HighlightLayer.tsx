"use client";

import { useEffect, useMemo, useState } from "react";
import { offsetsToRects } from "@/lib/highlight-renderer";
import type { Citation } from "@/types/citation";
import type { TextItem, HighlightRect } from "@/types/pdf";

interface HighlightLayerProps {
  citation: Citation;
  textItems: Map<number, TextItem[]>;
  pageRefs: Map<number, HTMLDivElement>;
  scale: number;
}

export function HighlightLayer({
  citation,
  textItems,
  pageRefs,
}: HighlightLayerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const rects = useMemo<HighlightRect[]>(() => {
    const pageTextItems = textItems.get(citation.page);
    if (!pageTextItems) {
      return [];
    }
    return offsetsToRects(citation, pageTextItems);
  }, [citation, textItems]);

  const pageElement = useMemo(
    () => pageRefs.get(citation.page) || null,
    [pageRefs, citation.page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!pageElement || rects.length === 0 || !isVisible) {
    return null;
  }

  const pageRect = pageElement.getBoundingClientRect();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {rects.map((rect, index) => (
        <div
          key={index}
          className="absolute highlight-orange citation-flash rounded-sm"
          style={{
            left: pageRect.left + rect.x * pageRect.width,
            top: pageRect.top + rect.y * pageRect.height,
            width: rect.width * pageRect.width,
            height: rect.height * pageRect.height,
          }}
        />
      ))}
    </div>
  );
}
