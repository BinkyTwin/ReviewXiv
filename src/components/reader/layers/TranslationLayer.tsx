"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { HighlightRect } from "@/types/highlight";

/**
 * Inline translation data
 */
export interface InlineTranslation {
  id: string;
  pageNumber: number;
  sourceText: string;
  sourceLanguage?: string;
  targetLanguage: string;
  translatedText: string;
  startOffset: number;
  endOffset: number;
  rects: HighlightRect[];
  isActive: boolean; // true = show translation, false = show original
}

interface TranslationLayerProps {
  /** List of inline translations on this page */
  translations: InlineTranslation[];
  /** Scale factor for font sizing */
  scale?: number;
  /** Callback when translation toggle is clicked */
  onToggle?: (translationId: string) => void;
  /** CSS class for the container */
  className?: string;
}

/**
 * TranslationLayer Component
 *
 * Renders inline translations as overlays that cover the original text.
 * Each translation can be toggled between original and translated view.
 *
 * Z-Index: +40 (above highlights, below citations)
 */
export const TranslationLayer = memo(function TranslationLayer({
  translations,
  scale = 1,
  onToggle,
  className,
}: TranslationLayerProps) {
  const handleToggle = useCallback(
    (translationId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle?.(translationId);
    },
    [onToggle]
  );

  if (translations.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "translation-layer absolute inset-0 pointer-events-none",
        "z-40", // Z-index for translation layer
        className
      )}
    >
      {translations.map((translation) => {
        // Use the bounding box of all rects
        if (translation.rects.length === 0) return null;

        const minX = Math.min(...translation.rects.map((r) => r.x));
        const minY = Math.min(...translation.rects.map((r) => r.y));
        const maxX = Math.max(
          ...translation.rects.map((r) => r.x + r.width)
        );
        const maxY = Math.max(
          ...translation.rects.map((r) => r.y + r.height)
        );

        const width = maxX - minX;
        const height = maxY - minY;

        return (
          <div
            key={translation.id}
            className={cn(
              "absolute pointer-events-auto cursor-pointer",
              "transition-all duration-150 ease-out",
              "group"
            )}
            style={{
              left: `${minX * 100}%`,
              top: `${minY * 100}%`,
              width: `${width * 100}%`,
              minHeight: `${height * 100}%`,
            }}
            onClick={handleToggle(translation.id)}
            title={
              translation.isActive
                ? "Cliquez pour voir l'original"
                : "Cliquez pour voir la traduction"
            }
          >
            {/* Background overlay */}
            <div
              className={cn(
                "absolute inset-0 rounded-sm",
                "bg-white", // Match page background
                translation.isActive ? "opacity-100" : "opacity-0"
              )}
            />

            {/* Translated text */}
            <div
              className={cn(
                "relative px-0.5 py-0.5",
                "text-slate-800 leading-relaxed",
                "transition-opacity duration-150",
                translation.isActive ? "opacity-100" : "opacity-0"
              )}
              style={{
                fontSize: `${14 * scale}px`,
              }}
            >
              {translation.translatedText}
            </div>

            {/* Toggle button - appears on hover */}
            <div
              className={cn(
                "absolute -right-1 -top-1",
                "w-6 h-6 rounded-full",
                "bg-primary text-primary-foreground",
                "flex items-center justify-center",
                "text-[10px] font-medium",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity duration-150",
                "shadow-md",
                "pointer-events-auto"
              )}
            >
              {translation.isActive
                ? translation.sourceLanguage?.toUpperCase().slice(0, 2) || "OR"
                : translation.targetLanguage.toUpperCase().slice(0, 2)}
            </div>

            {/* Subtle border when active */}
            {translation.isActive && (
              <div
                className={cn(
                  "absolute inset-0 rounded-sm",
                  "border border-primary/20",
                  "pointer-events-none"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default TranslationLayer;
