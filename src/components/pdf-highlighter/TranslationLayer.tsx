"use client";

import { useCallback } from "react";
import type { MouseEvent } from "react";
import type { InlineTranslation } from "@/types/translation";
import type { PageDimensionsMap } from "./types";

interface TranslationLayerProps {
  translations: InlineTranslation[];
  pageDimensions: PageDimensionsMap;
  scale: number;
  onToggle?: (translationId: string, nextActive: boolean) => void;
}

interface SingleTranslationProps {
  translation: InlineTranslation;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  onToggle?: (translationId: string, nextActive: boolean) => void;
}

function SingleTranslation({
  translation,
  pageWidth,
  pageHeight,
  scale,
  onToggle,
}: SingleTranslationProps) {
  const rects = translation.rects;
  if (rects.length === 0) return null;

  // Calculate bounding box from all rects (normalized 0-1 coords)
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));

  // Convert to pixels with scale
  const left = x1 * pageWidth * scale;
  const top = y1 * pageHeight * scale;
  const width = (x2 - x1) * pageWidth * scale;
  const height = (y2 - y1) * pageHeight * scale;

  // Calculate font size based on rect height
  const avgRectHeight =
    rects.reduce((sum, r) => sum + r.height * pageHeight * scale, 0) /
    rects.length;
  const fontSize = Math.max(10, Math.min(16, avgRectHeight * 0.85));
  const lineHeight = Math.max(fontSize * 1.3, avgRectHeight);

  const showTranslation = translation.isActive;
  const badgeLabel = translation.targetLanguage.toUpperCase().slice(0, 2);

  const handleToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onToggle?.(translation.id, !translation.isActive);
    },
    [translation.id, translation.isActive, onToggle],
  );

  // Padding to ensure full text coverage
  const padding = 4;

  // When NOT active, just show a small toggle button
  if (!showTranslation) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        style={{
          position: "absolute",
          left: left + width - 12,
          top: top - 4,
          zIndex: 1000,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid rgba(234, 88, 12, 0.4)",
          backgroundColor: "rgba(234, 88, 12, 0.1)",
          color: "#ea580c",
          fontSize: "9px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.backgroundColor = "rgba(234, 88, 12, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.backgroundColor = "rgba(234, 88, 12, 0.1)";
        }}
        title="Afficher la traduction"
      >
        {badgeLabel}
      </button>
    );
  }

  // When active, show the full opaque overlay
  return (
    <>
      {/* Main overlay - completely opaque */}
      <div
        onClick={handleToggle}
        style={{
          position: "absolute",
          left: left - padding,
          top: top - padding,
          width: width + padding * 2,
          minHeight: height + padding * 2,
          zIndex: 1000,
          cursor: "pointer",
          // CRITICAL: Use solid background color, no transparency
          backgroundColor: "#fafafa",
          borderRadius: "4px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
          // Text styling
          padding: "4px 6px",
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}px`,
          fontWeight: 450,
          letterSpacing: "-0.01em",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#1a1a1a",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        title="Cliquez pour voir l'original"
      >
        {translation.translatedText}
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          position: "absolute",
          left: left + width + padding,
          top: top - padding,
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "2px solid white",
          backgroundColor: "#ea580c",
          color: "white",
          fontSize: "10px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
        }}
        title="Voir l'original"
      >
        {badgeLabel}
      </button>
    </>
  );
}

/**
 * TranslationLayer renders translation overlays OUTSIDE the react-pdf-highlighter system.
 * This ensures the overlays are truly opaque and not affected by the library's blend modes.
 *
 * This component should be positioned as a sibling to the PdfHighlighter, not inside it.
 */
export function TranslationLayer({
  translations,
  pageDimensions,
  scale,
  onToggle,
}: TranslationLayerProps) {
  if (translations.length === 0 || pageDimensions.size === 0) {
    return null;
  }

  // Group translations by page
  const translationsByPage = new Map<number, InlineTranslation[]>();
  for (const t of translations) {
    const pageTranslations = translationsByPage.get(t.pageNumber) || [];
    pageTranslations.push(t);
    translationsByPage.set(t.pageNumber, pageTranslations);
  }

  // Calculate cumulative Y offset for each page
  // Pages are stacked vertically in the PDF viewer
  const pageOffsets = new Map<number, number>();
  let cumulativeY = 0;
  for (let pageNum = 1; pageNum <= pageDimensions.size; pageNum++) {
    pageOffsets.set(pageNum, cumulativeY);
    const dim = pageDimensions.get(pageNum);
    if (dim) {
      cumulativeY += dim.height * scale + 10; // 10px gap between pages
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none", // Allow clicks to pass through to PDF
        zIndex: 100, // Above the PDF but below modals/tooltips
      }}
    >
      {Array.from(translationsByPage.entries()).map(
        ([pageNumber, pageTranslations]) => {
          const dim = pageDimensions.get(pageNumber);
          const yOffset = pageOffsets.get(pageNumber) ?? 0;
          if (!dim) return null;

          return (
            <div
              key={pageNumber}
              style={{
                position: "absolute",
                top: yOffset,
                left: 0,
                width: dim.width * scale,
                height: dim.height * scale,
                pointerEvents: "none",
              }}
            >
              {pageTranslations.map((translation) => (
                <div
                  key={translation.id}
                  style={{ pointerEvents: "auto" }} // Re-enable for translation elements
                >
                  <SingleTranslation
                    translation={translation}
                    pageWidth={dim.width}
                    pageHeight={dim.height}
                    scale={scale}
                    onToggle={onToggle}
                  />
                </div>
              ))}
            </div>
          );
        },
      )}
    </div>
  );
}
