"use client";

import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { HighlightRect } from "@/types/highlight";

export interface CitationHighlight {
  id: string;
  rects: HighlightRect[];
}

interface CitationLayerProps {
  /** Active citation to flash */
  citation: CitationHighlight | null;
  /** Duration of the flash animation in ms (default: 3000) */
  flashDuration?: number;
  /** Callback when flash animation completes */
  onFlashComplete?: () => void;
  /** CSS class for the container */
  className?: string;
}

/**
 * CitationLayer Component
 *
 * Renders temporary flash highlights for AI citations.
 * When a citation is clicked in the chat, this layer
 * shows an animated highlight that fades out after a duration.
 *
 * Z-Index: +50 (above HighlightLayer, visible over content)
 */
export const CitationLayer = memo(function CitationLayer({
  citation,
  flashDuration = 3000,
  onFlashComplete,
  className,
}: CitationLayerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentCitation, setCurrentCitation] =
    useState<CitationHighlight | null>(null);

  useEffect(() => {
    if (!citation) {
      return;
    }

    // Start new flash
    setCurrentCitation(citation);
    setIsVisible(true);

    // Hide after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      onFlashComplete?.();
    }, flashDuration);

    return () => clearTimeout(timer);
  }, [citation, flashDuration, onFlashComplete]);

  // Clear citation after fade out
  useEffect(() => {
    if (!isVisible && currentCitation) {
      const timer = setTimeout(() => {
        setCurrentCitation(null);
      }, 300); // Match transition duration

      return () => clearTimeout(timer);
    }
  }, [isVisible, currentCitation]);

  if (!currentCitation || currentCitation.rects.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "citation-layer absolute inset-0 pointer-events-none",
        "z-50", // Z-index for citation layer (above highlights)
        "transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {currentCitation.rects.map((rect, index) => (
        <div
          key={`citation-${currentCitation.id}-${index}`}
          className={cn(
            "absolute rounded-sm",
            "highlight-orange",
            "citation-flash"
          )}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        />
      ))}
    </div>
  );
});

export default CitationLayer;
