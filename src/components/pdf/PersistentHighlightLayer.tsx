"use client";

import { useCallback, useEffect, useState } from "react";
import type { Highlight, HighlightColor } from "@/types/highlight";

interface PersistentHighlightLayerProps {
  highlights: Highlight[];
  pageRefs: Map<number, HTMLDivElement>;
  onHighlightClick?: (highlight: Highlight) => void;
}

const COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: "highlight-yellow",
  green: "highlight-green",
  blue: "highlight-blue",
  red: "highlight-red",
  purple: "highlight-purple",
};

export function PersistentHighlightLayer({
  highlights,
  pageRefs,
  onHighlightClick,
}: PersistentHighlightLayerProps) {
  const [, forceUpdate] = useState({});

  // Re-render on scroll/resize to update positions
  useEffect(() => {
    const handleUpdate = () => forceUpdate({});

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, []);

  const getHighlightStyle = useCallback(
    (highlight: Highlight, rectIndex: number) => {
      const pageElement = pageRefs.get(highlight.pageNumber);
      if (!pageElement) return null;

      const pageRect = pageElement.getBoundingClientRect();
      const rect = highlight.rects[rectIndex];
      if (!rect) return null;

      return {
        left: pageRect.left + rect.x * pageRect.width,
        top: pageRect.top + rect.y * pageRect.height,
        width: rect.width * pageRect.width,
        height: rect.height * pageRect.height,
      };
    },
    [pageRefs],
  );

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {highlights.map((highlight) =>
        highlight.rects.map((_, rectIndex) => {
          const style = getHighlightStyle(highlight, rectIndex);
          if (!style) return null;

          return (
            <div
              key={`${highlight.id}-${rectIndex}`}
              className={`absolute rounded-sm cursor-pointer pointer-events-auto hover:opacity-80 transition-opacity ${COLOR_CLASSES[highlight.color]}`}
              style={style}
              onClick={() => onHighlightClick?.(highlight)}
              title={highlight.selectedText.slice(0, 100)}
            />
          );
        }),
      )}
    </div>
  );
}
