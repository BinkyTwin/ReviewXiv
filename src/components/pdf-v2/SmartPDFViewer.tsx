"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Highlight, HighlightRect } from "@/types/highlight";
import type { Citation } from "@/types/citation";
import { HighlightLayer, TranslationLayer } from "@/components/reader/layers";
import type {
  HighlightData,
  InlineTranslation,
  SmartSelectionData,
} from "./types";
import type { MistralImage, MistralPage } from "@/lib/mistral-ocr";

interface SmartPDFViewerProps {
  pdfUrl: string;
  className?: string;
  highlights?: Highlight[];
  activeCitation?: Citation | null;
  inlineTranslations?: InlineTranslation[];
  onHighlightClick?: (highlight: Highlight) => void;
  onTextSelect?: (selection: SmartSelectionData | null) => void;
  onPageChange?: (pageNumber: number) => void;
  onTranslationToggle?: (translationId: string) => void;
}

const HORIZONTAL_PADDING = 48;

export function SmartPDFViewer({
  pdfUrl,
  className,
  highlights = [],
  activeCitation,
  inlineTranslations = [],
  onHighlightClick,
  onTextSelect,
  onPageChange,
  onTranslationToggle,
}: SmartPDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef(1);
  const [pages, setPages] = useState<MistralPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchOCR = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/mistral-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentUrl: pdfUrl,
            includeImages: true,
            outputFormat: "html",
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          const message =
            errorPayload?.error || "Impossible de charger le contenu OCR.";
          throw new Error(message);
        }

        const data = await response.json();
        if (!isCancelled) {
          setPages(data.pages || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "Erreur OCR inattendue.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    if (pdfUrl) {
      fetchOCR();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  const pageIndexOffset = useMemo(
    () => (pages.some((page) => page.index === 0) ? 1 : 0),
    [pages],
  );

  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.index - b.index),
    [pages],
  );

  const renderPages = useMemo(
    () =>
      orderedPages.map((page) => ({
        page,
        pageNumber: page.index + pageIndexOffset,
        html: buildPageHtml(page),
      })),
    [orderedPages, pageIndexOffset],
  );

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, HighlightData[]>();

    for (const highlight of highlights) {
      const pageHighlights = map.get(highlight.pageNumber) ?? [];
      pageHighlights.push({
        id: highlight.id,
        rects: highlight.rects,
        color: highlight.color,
        text: highlight.selectedText,
      });
      map.set(highlight.pageNumber, pageHighlights);
    }

    return map;
  }, [highlights]);

  const translationsByPage = useMemo(() => {
    const map = new Map<number, InlineTranslation[]>();

    for (const translation of inlineTranslations) {
      const pageTranslations = map.get(translation.pageNumber) ?? [];
      pageTranslations.push(translation);
      map.set(translation.pageNumber, pageTranslations);
    }

    return map;
  }, [inlineTranslations]);

  const handleHighlightClick = useCallback(
    (highlightId: string) => {
      const highlight = highlights.find((h) => h.id === highlightId);
      if (highlight) {
        onHighlightClick?.(highlight);
      }
    },
    [highlights, onHighlightClick],
  );

  const handleSelectionChange = useCallback(() => {
    if (!onTextSelect) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      onTextSelect(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const pageElement = getPageElement(containerRef.current, range.startContainer);
    const endPageElement = getPageElement(containerRef.current, range.endContainer);

    if (!pageElement || pageElement !== endPageElement) {
      onTextSelect(null);
      return;
    }

    const contentElement = pageElement.querySelector(
      "[data-ocr-content='true']",
    ) as HTMLElement | null;
    if (
      contentElement &&
      (!contentElement.contains(range.startContainer) ||
        !contentElement.contains(range.endContainer))
    ) {
      onTextSelect(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onTextSelect(null);
      return;
    }

    const pageNumber = parseInt(pageElement.dataset.pageNumber || "0", 10);
    if (!pageNumber) {
      onTextSelect(null);
      return;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const rects = getSelectionRects(range, pageRect);
    const selectionRect = range.getBoundingClientRect();
    const offsetRoot = contentElement ?? pageElement;
    const startOffset = getOffsetWithin(
      offsetRoot,
      range.startContainer,
      range.startOffset,
    );
    const endOffset = getOffsetWithin(
      offsetRoot,
      range.endContainer,
      range.endOffset,
    );

    onTextSelect({
      pageNumber,
      startOffset: Math.min(startOffset, endOffset),
      endOffset: Math.max(startOffset, endOffset),
      selectedText,
      position: {
        x: selectionRect.left + selectionRect.width / 2,
        y: selectionRect.top - 10,
      },
      rects,
    });
  }, [onTextSelect]);

  useEffect(() => {
    if (!onTextSelect) return;

    const handleMouseUp = () => handleSelectionChange();
    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        event.key.startsWith("Arrow") ||
        event.key === "Shift" ||
        event.key === "Meta" ||
        event.key === "Control"
      ) {
        handleSelectionChange();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleSelectionChange, onTextSelect]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") {
        setContainerWidth(width);
      }
    });

    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeCitation || !containerRef.current) return;

    const pageElement = containerRef.current.querySelector(
      `[data-page-number="${activeCitation.page}"]`,
    );
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeCitation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onPageChange) return;

    const handleScroll = () => {
      const pageElements = container.querySelectorAll("[data-page-number]");
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      let closestPage = currentPageRef.current;
      let closestDistance = Number.POSITIVE_INFINITY;

      pageElements.forEach((page) => {
        const rect = page.getBoundingClientRect();
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(pageCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = parseInt(
            (page as HTMLElement).dataset.pageNumber || "1",
            10,
          );
        }
      });

      if (closestPage !== currentPageRef.current) {
        currentPageRef.current = closestPage;
        onPageChange(closestPage);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onPageChange]);

  useEffect(() => {
    if (renderPages.length > 0) {
      const firstPage = renderPages[0].pageNumber;
      currentPageRef.current = firstPage;
      onPageChange?.(firstPage);
    }
  }, [renderPages, onPageChange]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Chargement OCR...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center text-destructive">
            <p className="font-medium">Erreur OCR</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (renderPages.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Aucun contenu OCR disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 py-6 px-6"
      >
        <div className="flex flex-col items-center gap-6">
          {renderPages.map(({ page, pageNumber, html }) => {
            const pageWidth = page.dimensions?.width || 1;
            const pageHeight = page.dimensions?.height || 1;
            const availableWidth =
              containerWidth > 0
                ? Math.max(0, containerWidth - HORIZONTAL_PADDING)
                : pageWidth;
            const scale = pageWidth > 0 ? Math.min(1, availableWidth / pageWidth) : 1;
            const scaledWidth = pageWidth * scale;
            const scaledHeight = pageHeight * scale;
            const pageHighlights = highlightsByPage.get(pageNumber) ?? [];
            const pageTranslations = translationsByPage.get(pageNumber) ?? [];

            return (
              <div
                key={pageNumber}
                className="relative bg-white shadow-lg mx-auto"
                data-page-number={pageNumber}
                style={{
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                }}
              >
                {html ? (
                  <div
                    className="absolute inset-0 origin-top-left text-black"
                    style={{
                      width: `${pageWidth}px`,
                      height: `${pageHeight}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }}
                    data-ocr-content="true"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    HTML OCR indisponible pour cette page.
                  </div>
                )}

                {pageHighlights.length > 0 && (
                  <HighlightLayer
                    highlights={pageHighlights}
                    onHighlightClick={handleHighlightClick}
                  />
                )}

                {pageTranslations.length > 0 && (
                  <TranslationLayer
                    translations={pageTranslations}
                    scale={scale}
                    onToggle={onTranslationToggle}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildPageHtml(page: MistralPage): string {
  const rawHtml = page.html || "";
  if (!rawHtml) return "";

  const stripped = stripDocumentShell(rawHtml);
  const imageMap = buildImageMap(page.images || []);
  return replaceImageSources(stripped, imageMap);
}

function stripDocumentShell(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
    .trim();
}

function buildImageMap(images: MistralImage[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const image of images) {
    if (!image.image_base64) continue;
    const dataUrl = image.image_base64.startsWith("data:")
      ? image.image_base64
      : `data:image/png;base64,${image.image_base64}`;
    map.set(image.id, dataUrl);
  }

  return map;
}

function replaceImageSources(
  html: string,
  imageMap: Map<string, string>,
): string {
  if (imageMap.size === 0) return html;

  return html.replace(/src=(["'])([^"']+)\1/gi, (match, quote, src) => {
    const normalized = src.replace(/\.(png|jpe?g|gif|webp|svg)$/i, "");
    const dataUrl = imageMap.get(src) || imageMap.get(normalized);
    if (!dataUrl) return match;
    return `src=${quote}${dataUrl}${quote}`;
  });
}

function getPageElement(
  container: HTMLElement | null,
  node: Node | null,
): HTMLElement | null {
  if (!container || !node) return null;

  const element =
    node instanceof HTMLElement ? node : (node.parentElement as HTMLElement | null);
  if (!element) return null;

  const pageElement = element.closest("[data-page-number]");
  if (!pageElement) return null;
  if (!container.contains(pageElement)) return null;

  return pageElement as HTMLElement;
}

function getOffsetWithin(
  root: HTMLElement,
  node: Node,
  offset: number,
): number {
  if (!root.contains(node)) return 0;

  const range = document.createRange();
  range.setStart(root, 0);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }

  return range.toString().length;
}

function getSelectionRects(range: Range, pageRect: DOMRect): HighlightRect[] {
  if (pageRect.width === 0 || pageRect.height === 0) return [];

  const rects: HighlightRect[] = [];
  const clientRects = Array.from(range.getClientRects());

  for (const rect of clientRects) {
    const left = Math.max(rect.left, pageRect.left);
    const right = Math.min(rect.right, pageRect.right);
    const top = Math.max(rect.top, pageRect.top);
    const bottom = Math.min(rect.bottom, pageRect.bottom);

    if (right <= left || bottom <= top) continue;

    rects.push({
      x: (left - pageRect.left) / pageRect.width,
      y: (top - pageRect.top) / pageRect.height,
      width: (right - left) / pageRect.width,
      height: (bottom - top) / pageRect.height,
    });
  }

  return rects;
}

export type { SmartSelectionData };
export default SmartPDFViewer;
