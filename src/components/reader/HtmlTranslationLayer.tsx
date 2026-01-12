"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { HtmlInlineTranslation } from "@/types/translation";
import { createRangeFromOffsets } from "@/lib/html/selection";
import { cn } from "@/lib/utils";

interface HtmlTranslationLayerProps {
  translations: HtmlInlineTranslation[];
  contentRef: React.RefObject<HTMLElement>;
  onToggle?: (translationId: string, nextActive: boolean) => void;
}

interface TranslationBox {
  translation: HtmlInlineTranslation;
  rect: { left: number; top: number; width: number; height: number };
}

export function HtmlTranslationLayer({
  translations,
  contentRef,
  onToggle,
}: HtmlTranslationLayerProps) {
  const [boxes, setBoxes] = useState<TranslationBox[]>([]);

  const computeBoxes = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const nextBoxes: TranslationBox[] = [];

    for (const translation of translations) {
      const sectionElement = container.querySelector(
        `[data-section-id="${CSS.escape(translation.sectionId)}"]`,
      );
      if (!sectionElement || !(sectionElement instanceof HTMLElement)) {
        continue;
      }

      const range = createRangeFromOffsets(
        sectionElement,
        translation.startOffset,
        translation.endOffset,
      );
      if (!range) continue;

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      nextBoxes.push({
        translation,
        rect: {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    setBoxes(nextBoxes);
  }, [contentRef, translations]);

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

  if (boxes.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {boxes.map(({ translation, rect }) => {
        const badge = translation.targetLanguage.toUpperCase().slice(0, 2);
        const toggle = () =>
          onToggle?.(translation.id, !translation.isActive);

        return (
          <div key={translation.id} style={{ pointerEvents: "auto" }}>
            {translation.isActive ? (
              <div
                className={cn(
                  "absolute rounded-md border border-border bg-background text-foreground",
                  "shadow-sm px-2 py-1 text-xs leading-relaxed",
                )}
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  minHeight: rect.height,
                }}
                onClick={toggle}
                title="Cliquer pour voir l'original"
              >
                {translation.translatedText}
              </div>
            ) : (
              <button
                type="button"
                className={cn(
                  "absolute h-5 w-5 rounded-full text-[9px] font-semibold",
                  "bg-secondary text-secondary-foreground border border-border",
                  "shadow-sm",
                )}
                style={{
                  left: rect.left + rect.width - 8,
                  top: rect.top - 10,
                }}
                onClick={toggle}
                title="Afficher la traduction"
              >
                {badge}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
