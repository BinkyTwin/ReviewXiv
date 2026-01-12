"use client";

import { useMemo } from "react";
import type { HtmlHighlight, HighlightColor } from "@/types/highlight";
import { useHtmlHighlights } from "@/hooks/useHtmlHighlights";
import { cn } from "@/lib/utils";

interface HtmlHighlightLayerProps {
  highlights: HtmlHighlight[];
  contentRef: React.RefObject<HTMLElement>;
  onHighlightClick?: (highlight: HtmlHighlight) => void;
}

const COLOR_VARS: Record<HighlightColor, string> = {
  yellow: "--highlight-yellow",
  green: "--highlight-green",
  blue: "--highlight-blue",
  red: "--highlight-red",
  purple: "--highlight-purple",
};

export function HtmlHighlightLayer({
  highlights,
  contentRef,
  onHighlightClick,
}: HtmlHighlightLayerProps) {
  const { boxes } = useHtmlHighlights({ highlights, contentRef });

  const boxGroups = useMemo(() => {
    const grouped = new Map<string, HtmlHighlight>();
    for (const highlight of highlights) {
      grouped.set(highlight.id, highlight);
    }
    return grouped;
  }, [highlights]);

  if (boxes.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {boxes.map((box, index) => {
        const highlight = boxGroups.get(box.id);
        const colorVar = COLOR_VARS[box.color];
        return (
          <div
            key={`${box.id}-${index}`}
            className={cn("absolute rounded-sm pointer-events-auto")}
            style={{
              left: box.rect.left,
              top: box.rect.top,
              width: box.rect.width,
              height: box.rect.height,
              backgroundColor: `hsl(var(${colorVar}) / 0.35)`,
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (highlight) {
                onHighlightClick?.(highlight);
              }
            }}
          />
        );
      })}
    </div>
  );
}
