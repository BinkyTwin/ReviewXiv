"use client";

import { useEffect, useState } from "react";
import type { HighlightRect } from "@/types/highlight";

interface CitationFlashProps {
  /** Rects to highlight (normalized 0-1) */
  rects: HighlightRect[];
  /** Page number */
  pageNumber: number;
  /** Duration of flash animation in ms */
  duration?: number;
  /** Callback when flash animation completes */
  onComplete?: () => void;
}

/**
 * CitationFlash component displays a temporary flash animation
 * over the citation area when a user clicks on a citation in the chat.
 */
export function CitationFlash({
  rects,
  pageNumber,
  duration = 3000,
  onComplete,
}: CitationFlashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Start fade out after 2/3 of the duration
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, duration * 0.66);

    // Hide completely after full duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible || rects.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        opacity,
        transition: `opacity ${duration * 0.33}ms ease-out`,
      }}
    >
      {rects.map((rect, i) => (
        <div
          key={i}
          className="absolute citation-flash"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
            backgroundColor: "hsl(var(--primary) / 0.4)",
            borderRadius: "2px",
          }}
        />
      ))}
    </div>
  );
}
