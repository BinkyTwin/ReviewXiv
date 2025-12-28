"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { HighlightRect, HighlightColor } from "@/types/highlight";

/**
 * Single highlight data for rendering
 */
export interface HighlightData {
  id: string;
  rects: HighlightRect[];
  color: HighlightColor;
  text?: string;
  hasAnnotation?: boolean;
  annotationCount?: number;
}

interface HighlightLayerProps {
  /** List of highlights to render on this page */
  highlights: HighlightData[];
  /** Callback when a highlight is clicked */
  onHighlightClick?: (highlightId: string) => void;
  /** Callback when hovering a highlight */
  onHighlightHover?: (highlightId: string | null) => void;
  /** Currently hovered highlight ID */
  hoveredHighlightId?: string | null;
  /** CSS class for the container */
  className?: string;
}

/**
 * CSS classes for highlight colors
 */
const COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: "highlight-yellow",
  green: "highlight-green",
  blue: "highlight-blue",
  red: "highlight-red",
  purple: "highlight-purple",
};

/**
 * HighlightLayer Component
 *
 * Renders persistent highlights on a PDF page using relative positioning.
 * Each highlight is positioned using percentage-based coordinates,
 * ensuring correct positioning during scroll and zoom.
 *
 * Z-Index: +20 (below SelectionOverlay and CitationLayer)
 */
export const HighlightLayer = memo(function HighlightLayer({
  highlights,
  onHighlightClick,
  onHighlightHover,
  hoveredHighlightId,
  className,
}: HighlightLayerProps) {
  const handleClick = useCallback(
    (highlightId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onHighlightClick?.(highlightId);
    },
    [onHighlightClick]
  );

  const handleMouseEnter = useCallback(
    (highlightId: string) => () => {
      onHighlightHover?.(highlightId);
    },
    [onHighlightHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHighlightHover?.(null);
  }, [onHighlightHover]);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "highlight-layer absolute inset-0 pointer-events-none",
        "z-20", // Z-index for highlight layer
        className
      )}
    >
      {highlights.map((highlight) =>
        highlight.rects.map((rect, rectIndex) => (
          <div
            key={`${highlight.id}-rect-${rectIndex}`}
            className={cn(
              "absolute rounded-sm cursor-pointer pointer-events-auto",
              "transition-opacity duration-150",
              COLOR_CLASSES[highlight.color],
              hoveredHighlightId === highlight.id
                ? "opacity-60"
                : "opacity-100 hover:opacity-80"
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
            onClick={handleClick(highlight.id)}
            onMouseEnter={handleMouseEnter(highlight.id)}
            onMouseLeave={handleMouseLeave}
            title={highlight.text?.slice(0, 100)}
            data-highlight-id={highlight.id}
          />
        ))
      )}

      {/* Annotation markers for highlights with notes */}
      {highlights
        .filter((h) => h.hasAnnotation && h.rects.length > 0)
        .map((highlight) => {
          // Position marker at the end of the last rect
          const lastRect = highlight.rects[highlight.rects.length - 1];
          return (
            <div
              key={`${highlight.id}-marker`}
              className={cn(
                "absolute w-4 h-4 rounded-full cursor-pointer pointer-events-auto",
                "flex items-center justify-center text-[10px] font-medium",
                "transition-transform duration-150 hover:scale-110",
                COLOR_CLASSES[highlight.color],
                "border-2 border-white shadow-sm"
              )}
              style={{
                left: `calc(${(lastRect.x + lastRect.width) * 100}% + 2px)`,
                top: `${lastRect.y * 100}%`,
              }}
              onClick={handleClick(highlight.id)}
              title={`${highlight.annotationCount || 1} annotation(s)`}
            >
              {(highlight.annotationCount || 1) > 1
                ? highlight.annotationCount
                : null}
            </div>
          );
        })}
    </div>
  );
});

export default HighlightLayer;
