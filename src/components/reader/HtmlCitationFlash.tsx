"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { HtmlCitation } from "@/types/citation";
import { createRangeFromOffsets } from "@/lib/html/selection";

interface HtmlCitationFlashProps {
  citation: HtmlCitation | null;
  contentRef: React.RefObject<HTMLElement>;
  duration?: number;
  onComplete?: () => void;
}

export function HtmlCitationFlash({
  citation,
  contentRef,
  duration = 3000,
  onComplete,
}: HtmlCitationFlashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [rects, setRects] = useState<
    Array<{ left: number; top: number; width: number; height: number }>
  >([]);

  useLayoutEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!citation || !container) {
        setRects([]);
        return;
      }

      const sectionElement = container.querySelector(
        `[data-section-id="${CSS.escape(citation.sectionId)}"]`,
      );
      if (!sectionElement || !(sectionElement instanceof HTMLElement)) {
        setRects([]);
        return;
      }

      const range = createRangeFromOffsets(
        sectionElement,
        citation.start,
        citation.end,
      );

      if (!range) {
        setRects([]);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      setRects(
        Array.from(range.getClientRects()).map((rect) => ({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        })),
      );
    });

    return () => window.cancelAnimationFrame(raf);
  }, [citation, contentRef]);

  useEffect(() => {
    if (!citation) return;
    const raf = window.requestAnimationFrame(() => {
      setIsVisible(true);
      setOpacity(1);
    });

    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, duration * 0.66);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      window.cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [citation, duration, onComplete]);

  if (!citation || !isVisible || rects.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-40"
      style={{
        opacity,
        transition: `opacity ${duration * 0.33}ms ease-out`,
      }}
    >
      {rects.map((rect, index) => (
        <div
          key={`${citation.sectionId}-${index}`}
          className="absolute rounded-sm"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: "hsl(var(--primary) / 0.35)",
          }}
        />
      ))}
    </div>
  );
}
