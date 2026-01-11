"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MouseEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type {
  Highlight,
  PdfHighlighterUtils,
  PdfSelection,
  GhostHighlight,
  ViewportHighlight,
} from "react-pdf-highlighter-extended";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  useHighlightContainerContext,
  usePdfHighlighterContext,
} from "react-pdf-highlighter-extended";

import type {
  Highlight as SupabaseHighlight,
  HighlightColor,
  HighlightRect,
} from "@/types/highlight";
import type {
  InlineTranslation,
  TranslationSelection,
} from "@/types/translation";
import type { PDFHighlighterViewerProps, PageDimensionsMap } from "./types";
import { HighlightTip } from "./HighlightTip";
import { AreaSelectionTip } from "./AreaSelectionTip";
import { CitationFlash } from "./CitationFlash";
import { ZoomToolbar } from "./ZoomToolbar";
import { offsetsToRects } from "@/lib/highlight-renderer";
import { cn } from "@/lib/utils";

// Map ReviewXiv colors to highlight classes
const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: "highlight-yellow",
  green: "highlight-green",
  blue: "highlight-blue",
  red: "highlight-red",
  purple: "highlight-purple",
};

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

// Extended Highlight type with color support
interface ColoredHighlight extends Highlight {
  color?: HighlightColor;
}

interface TranslationHighlight extends Highlight {
  kind: "translation";
  translation: InlineTranslation;
}

type ViewerHighlight = ColoredHighlight | TranslationHighlight;

const isTranslationHighlight = (
  highlight: ViewportHighlight<ViewerHighlight>,
): highlight is ViewportHighlight<TranslationHighlight> =>
  "kind" in highlight && highlight.kind === "translation";

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Convert Supabase highlights to react-pdf-highlighter-extended format
function supabaseToExtendedHighlight(
  highlight: SupabaseHighlight,
  pageDimensions: PageDimensionsMap,
): ColoredHighlight | null {
  const pageDim = pageDimensions.get(highlight.pageNumber);
  if (!pageDim) return null;

  // Convert normalized rects (0-1) to pixel positions
  const rects = highlight.rects.map((rect) => ({
    pageNumber: highlight.pageNumber,
    x1: rect.x * pageDim.width,
    y1: rect.y * pageDim.height,
    x2: (rect.x + rect.width) * pageDim.width,
    y2: (rect.y + rect.height) * pageDim.height,
    width: pageDim.width,
    height: pageDim.height,
  }));

  // Calculate bounding rect
  const x1 = Math.min(...rects.map((r) => r.x1));
  const y1 = Math.min(...rects.map((r) => r.y1));
  const x2 = Math.max(...rects.map((r) => r.x2));
  const y2 = Math.max(...rects.map((r) => r.y2));

  return {
    id: highlight.id,
    position: {
      boundingRect: {
        pageNumber: highlight.pageNumber,
        x1,
        y1,
        x2,
        y2,
        width: pageDim.width,
        height: pageDim.height,
      },
      rects,
    },
    content: {
      text: highlight.selectedText,
    },
    color: highlight.color,
  };
}

function translationToExtendedHighlight(
  translation: InlineTranslation,
  pageDimensions: PageDimensionsMap,
): TranslationHighlight | null {
  const pageDim = pageDimensions.get(translation.pageNumber);
  if (!pageDim || translation.rects.length === 0) return null;

  const rects = translation.rects.map((rect) => ({
    pageNumber: translation.pageNumber,
    x1: rect.x * pageDim.width,
    y1: rect.y * pageDim.height,
    x2: (rect.x + rect.width) * pageDim.width,
    y2: (rect.y + rect.height) * pageDim.height,
    width: pageDim.width,
    height: pageDim.height,
  }));

  const x1 = Math.min(...rects.map((r) => r.x1));
  const y1 = Math.min(...rects.map((r) => r.y1));
  const x2 = Math.max(...rects.map((r) => r.x2));
  const y2 = Math.max(...rects.map((r) => r.y2));

  return {
    id: translation.id,
    position: {
      boundingRect: {
        pageNumber: translation.pageNumber,
        x1,
        y1,
        x2,
        y2,
        width: pageDim.width,
        height: pageDim.height,
      },
      rects,
    },
    content: {
      text: translation.sourceText,
    },
    kind: "translation",
    translation,
  };
}

// Highlight container component - renders each highlight
interface HighlightContainerProps {
  onHighlightClick?: (highlightId: string) => void;
  onTranslationToggle?: (translationId: string, nextActive: boolean) => void;
}

interface TranslationOverlayProps {
  highlight: ViewportHighlight<TranslationHighlight>;
  onToggle?: (translationId: string, nextActive: boolean) => void;
}

function TranslationOverlay({ highlight, onToggle }: TranslationOverlayProps) {
  const { translation } = highlight;
  const { boundingRect } = highlight.position;
  const rects = highlight.position.rects;

  if (boundingRect.width <= 0 || boundingRect.height <= 0) {
    return null;
  }

  const averageRectHeight =
    rects.length > 0
      ? rects.reduce((sum, rect) => sum + rect.height, 0) / rects.length
      : boundingRect.height;
  const fontSize = Math.max(10, Math.min(16, averageRectHeight * 0.85));
  const lineHeight = Math.max(fontSize * 1.3, averageRectHeight);
  const showTranslation = translation.isActive;
  const badgeLabel = translation.targetLanguage.toUpperCase().slice(0, 2);

  const handleToggle = (event: MouseEvent) => {
    event.stopPropagation();
    onToggle?.(translation.id, !translation.isActive);
  };

  // Extra padding to fully cover original text (accounts for font variations)
  const coverBleed = 4;

  // When NOT showing translation, render a minimal toggle-only element
  if (!showTranslation) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "absolute flex h-5 w-5 items-center justify-center",
          "rounded-full text-[9px] font-semibold",
          "pointer-events-auto transition-all duration-200 hover:scale-110 active:scale-95",
          "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20",
        )}
        style={{
          left: boundingRect.left + boundingRect.width - 10,
          top: boundingRect.top - 2,
          zIndex: 100,
        }}
        title="Afficher la traduction"
      >
        {badgeLabel}
      </button>
    );
  }

  // When showing translation, render a fully opaque overlay that masks original text
  return (
    <>
      {/*
        Global styles to neutralize parent blend modes from react-pdf-highlighter.
        The library wraps highlights in containers that use mix-blend-mode: multiply,
        which makes backgrounds semi-transparent. We need to force normal blend mode.
      */}
      <style>{`
        .translation-overlay-wrapper,
        .translation-overlay-wrapper * {
          mix-blend-mode: normal !important;
        }
        /* Target the library's Highlight container when it wraps our translation */
        .Highlight:has(.translation-overlay-wrapper) {
          mix-blend-mode: normal !important;
          isolation: isolate !important;
          z-index: 9999 !important;
        }
        /* Also target any parent divs that might have blend modes */
        div:has(> .translation-overlay-wrapper) {
          mix-blend-mode: normal !important;
          isolation: isolate !important;
        }
      `}</style>

      {/* Main overlay container - uses multiple techniques for opacity */}
      <div
        className="translation-overlay-wrapper"
        style={{
          position: "absolute",
          left: boundingRect.left - coverBleed,
          top: boundingRect.top - coverBleed,
          width: boundingRect.width + coverBleed * 2,
          minHeight: boundingRect.height + coverBleed * 2,
          zIndex: 99999,
          isolation: "isolate",
          mixBlendMode: "normal",
          // Use box-shadow to create an "extended" background that covers any gaps
          boxShadow: "0 0 0 2px #fafafa, 0 2px 8px rgba(0,0,0,0.08)",
          borderRadius: "4px",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
        onClick={handleToggle}
        title="Cliquez pour voir l'original"
      >
        {/* Layer 1: Solid opaque background using inline style (highest priority) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#fafafa",
            borderRadius: "4px",
            zIndex: 1,
          }}
        />

        {/* Layer 2: Additional background for dark mode support */}
        <div
          className="dark:bg-zinc-900"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#fafafa",
            borderRadius: "4px",
            zIndex: 2,
          }}
        />

        {/* Layer 3: Content */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            padding: "4px 6px",
            color: "#1a1a1a",
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}px`,
            fontWeight: 450,
            letterSpacing: "-0.01em",
            fontFamily: "system-ui, -apple-system, sans-serif",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          className="dark:text-zinc-100"
        >
          {translation.translatedText}
        </div>

        {/* Border decoration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "4px",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            pointerEvents: "none",
            zIndex: 4,
          }}
          className="dark:border-zinc-700/50"
        />
      </div>

      {/* Toggle button positioned outside the overlay */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "absolute flex h-6 w-6 items-center justify-center",
          "rounded-full text-[10px] font-bold shadow-md",
          "pointer-events-auto transition-all duration-200 hover:scale-110 active:scale-95",
          "bg-primary text-primary-foreground border-2 border-white dark:border-zinc-800",
        )}
        style={{
          left: boundingRect.left + boundingRect.width + coverBleed,
          top: boundingRect.top - coverBleed,
          transform: "translate(-50%, -50%)",
          zIndex: 100000,
        }}
        title="Voir l'original"
      >
        {badgeLabel}
      </button>
    </>
  );
}

function HighlightContainer({
  onHighlightClick,
  onTranslationToggle,
}: HighlightContainerProps) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext<ViewerHighlight>();

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onHighlightClick?.(highlight.id);
    },
    [highlight.id, onHighlightClick],
  );

  if (isTranslationHighlight(highlight)) {
    return (
      <TranslationOverlay
        highlight={highlight}
        onToggle={onTranslationToggle}
      />
    );
  }
  // Cast to access color property - need unknown intermediate cast due to type differences
  const coloredHighlight = highlight as unknown as ColoredHighlight;

  // Check if it's an area highlight (has image content)
  if (highlight.content?.image) {
    return (
      <AreaHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        onChange={() => {}}
        bounds="parent"
      />
    );
  }

  // Get color from our extended type
  const color = coloredHighlight.color || "yellow";

  // Map colors to CSS custom properties or inline styles
  const colorMap: Record<HighlightColor, string> = {
    yellow: "rgba(255, 226, 143, 0.5)",
    green: "rgba(119, 221, 119, 0.5)",
    blue: "rgba(173, 216, 230, 0.5)",
    red: "rgba(255, 105, 97, 0.5)",
    purple: "rgba(203, 153, 201, 0.5)",
  };

  return (
    <TextHighlight
      isScrolledTo={isScrolledTo}
      highlight={highlight}
      onClick={handleClick}
      style={{
        background: colorMap[color] ?? colorMap.yellow,
      }}
    />
  );
}

// Selection tip component that wraps HighlightTip
interface SelectionTipWrapperProps {
  onAddHighlight: (color: HighlightColor) => void;
  onAskSelection?: (text: string, page: number) => void;
  onTranslateSelection?: (selection: TranslationSelection) => void;
  onAskImage?: (imageData: string, page: number) => void;
  onAreaHighlightCreate?: (
    imageData: string,
    page: number,
    position: { x: number; y: number; width: number; height: number },
  ) => void;
}

function SelectionTipWrapper({
  onAddHighlight,
  onAskSelection,
  onTranslateSelection,
  onAskImage,
  onAreaHighlightCreate,
}: SelectionTipWrapperProps) {
  const { getCurrentSelection, removeGhostHighlight } =
    usePdfHighlighterContext();

  const selection = getCurrentSelection();
  if (!selection) return null;

  const handleDismiss = () => {
    removeGhostHighlight();
  };

  // Area selection (has image)
  if (selection.content?.image) {
    return (
      <AreaSelectionTip
        imageData={selection.content.image}
        onSave={
          onAreaHighlightCreate
            ? () => {
                const { x1, y1, x2, y2 } = selection.position.boundingRect;
                onAreaHighlightCreate(
                  selection.content.image!,
                  selection.position.boundingRect.pageNumber,
                  { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
                );
                handleDismiss();
              }
            : undefined
        }
        onAsk={
          onAskImage
            ? () => {
                onAskImage(
                  selection.content.image!,
                  selection.position.boundingRect.pageNumber,
                );
                handleDismiss();
              }
            : undefined
        }
        onDismiss={handleDismiss}
      />
    );
  }

  // Text selection
  return (
    <HighlightTip
      content={{ text: selection.content?.text || "" }}
      pageNumber={selection.position.boundingRect.pageNumber}
      onConfirm={(color) => {
        onAddHighlight(color);
        handleDismiss();
      }}
      onAsk={
        onAskSelection
          ? () => {
              onAskSelection(
                selection.content?.text || "",
                selection.position.boundingRect.pageNumber,
              );
              handleDismiss();
            }
          : undefined
      }
      onTranslate={
        onTranslateSelection
          ? () => {
              const rects = selection.position.rects.map((rect) => ({
                x: rect.x1 / rect.width,
                y: rect.y1 / rect.height,
                width: (rect.x2 - rect.x1) / rect.width,
                height: (rect.y2 - rect.y1) / rect.height,
              }));

              onTranslateSelection({
                text: selection.content?.text || "",
                pageNumber: selection.position.boundingRect.pageNumber,
                rects,
              });
              handleDismiss();
            }
          : undefined
      }
      onDismiss={handleDismiss}
    />
  );
}

// Inner component that handles the PDF document
interface PdfHighlighterInnerProps {
  pdfDocument: PDFDocumentProxy;
  areaSelectionMode: boolean;
  scaleValue: "page-width" | number;
  viewerHighlights: ViewerHighlight[];
  highlighterUtilsRef: React.MutableRefObject<PdfHighlighterUtils | undefined>;
  onPageDimensionsChange: (dimensions: PageDimensionsMap) => void;
  onViewerReady: () => void;
  onHighlightCreate: (selection: PdfSelection, color: HighlightColor) => void;
  onHighlightClick?: (highlightId: string) => void;
  onAskSelection?: (text: string, page: number) => void;
  onTranslateSelection?: (selection: TranslationSelection) => void;
  onAskImage?: (imageData: string, page: number) => void;
  onAreaHighlightCreate?: (
    imageData: string,
    page: number,
    position: { x: number; y: number; width: number; height: number },
  ) => void;
  onTranslationToggle?: (translationId: string, nextActive: boolean) => void;
}

function PdfHighlighterInner({
  pdfDocument,
  areaSelectionMode,
  scaleValue,
  viewerHighlights,
  highlighterUtilsRef,
  onPageDimensionsChange,
  onViewerReady,
  onHighlightCreate,
  onHighlightClick,
  onAskSelection,
  onTranslateSelection,
  onAskImage,
  onAreaHighlightCreate,
  onTranslationToggle,
}: PdfHighlighterInnerProps) {
  // Store current selection ref for highlight creation
  const currentSelectionRef = useRef<PdfSelection | null>(null);

  // Use ref to avoid closure issues with event listeners in the library
  const areaSelectionModeRef = useRef(areaSelectionMode);
  useEffect(() => {
    areaSelectionModeRef.current = areaSelectionMode;
  }, [areaSelectionMode]);

  // Load page dimensions
  useEffect(() => {
    let isCancelled = false;

    const loadPageDimensions = async () => {
      const dimensions: PageDimensionsMap = new Map();

      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        try {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          dimensions.set(pageNumber, {
            width: viewport.width,
            height: viewport.height,
          });
        } catch (error) {
          console.error("Failed to read PDF page dimensions", error);
        }
      }

      if (!isCancelled) {
        onPageDimensionsChange(dimensions);
        onViewerReady();
      }
    };

    loadPageDimensions();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, onPageDimensionsChange, onViewerReady]);

  const handleSelection = useCallback((selection: PdfSelection) => {
    // Store selection in ref for use in highlight creation
    currentSelectionRef.current = selection;
  }, []);

  const handleAddHighlight = useCallback(
    (color: HighlightColor) => {
      const selection = currentSelectionRef.current;
      if (selection) {
        onHighlightCreate(selection, color);
        currentSelectionRef.current = null;
      }
    },
    [onHighlightCreate],
  );

  const handleCreateGhostHighlight = useCallback((_ghost: GhostHighlight) => {
    // Ghost highlight created - tip will appear
  }, []);

  const handleRemoveGhostHighlight = useCallback((_ghost: GhostHighlight) => {
    currentSelectionRef.current = null;
  }, []);

  // Stable function that reads from ref to avoid closure issues
  // Note: Using global MouseEvent type (not React.MouseEvent) to match library's type
  const enableAreaSelectionFn = useCallback(
    (event: globalThis.MouseEvent) =>
      areaSelectionModeRef.current || event.altKey,
    [],
  );

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      enableAreaSelection={enableAreaSelectionFn}
      pdfScaleValue={scaleValue}
      highlights={viewerHighlights}
      onSelection={handleSelection}
      onCreateGhostHighlight={handleCreateGhostHighlight}
      onRemoveGhostHighlight={handleRemoveGhostHighlight}
      utilsRef={(utils) => {
        highlighterUtilsRef.current = utils;
      }}
      selectionTip={
        <SelectionTipWrapper
          onAddHighlight={handleAddHighlight}
          onAskSelection={onAskSelection}
          onTranslateSelection={onTranslateSelection}
          onAskImage={onAskImage}
          onAreaHighlightCreate={onAreaHighlightCreate}
        />
      }
      style={{ height: "100%", width: "100%", position: "absolute" }}
    >
      <HighlightContainer
        onHighlightClick={onHighlightClick}
        onTranslationToggle={onTranslationToggle}
      />
    </PdfHighlighter>
  );
}

export function PDFHighlighterViewer({
  pdfUrl,
  paperId,
  highlights = [],
  translations = [],
  activeCitation,
  textItemsMap,
  onHighlightCreate,
  onHighlightClick,
  onAskSelection,
  onTranslateSelection,
  onAskImage,
  onAreaHighlightCreate,
  scrollToHighlightRef,
  onTranslationToggle,
  translationLanguage,
  translationLanguageOptions,
  onTranslationLanguageChange,
  className,
}: PDFHighlighterViewerProps) {
  // Refs
  const highlighterUtilsRef = useRef<PdfHighlighterUtils>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [citationFlash, setCitationFlash] = useState<{
    pageNumber: number;
    rects: HighlightRect[];
  } | null>(null);
  const [areaSelectionMode, setAreaSelectionMode] = useState(false);
  const [pageDimensionsMap, setPageDimensionsMap] = useState<PageDimensionsMap>(
    new Map(),
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewerReady, setViewerReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Container width tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      setContainerWidth(containerRef.current?.clientWidth ?? 0);
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Reset on URL change
  useEffect(() => {
    setPageDimensionsMap(new Map());
    setZoomLevel(1);
    setViewerReady(false);
  }, [pdfUrl]);

  // Calculate scale
  const fitScale = useMemo(() => {
    if (!containerWidth || pageDimensionsMap.size === 0) return null;
    const firstPage =
      pageDimensionsMap.get(1) ?? Array.from(pageDimensionsMap.values())[0];
    if (!firstPage) return null;
    return containerWidth / firstPage.width;
  }, [containerWidth, pageDimensionsMap]);

  const scaleValue = useMemo((): "page-width" | number => {
    if (!viewerReady || !fitScale) return "page-width";
    const nextScale = fitScale * zoomLevel;
    return Number.isFinite(nextScale) ? nextScale : "page-width";
  }, [fitScale, zoomLevel, viewerReady]);

  // Convert highlights to extended format
  const extendedHighlights = useMemo(() => {
    if (!viewerReady || pageDimensionsMap.size === 0) return [];
    return highlights
      .map((h) => supabaseToExtendedHighlight(h, pageDimensionsMap))
      .filter((h): h is ColoredHighlight => h !== null);
  }, [highlights, pageDimensionsMap, viewerReady]);

  const translationHighlights = useMemo(() => {
    if (!viewerReady || pageDimensionsMap.size === 0) return [];
    return translations
      .map((t) => translationToExtendedHighlight(t, pageDimensionsMap))
      .filter((t): t is TranslationHighlight => t !== null);
  }, [translations, pageDimensionsMap, viewerReady]);

  const viewerHighlights = useMemo<ViewerHighlight[]>(
    () => [...extendedHighlights, ...translationHighlights],
    [extendedHighlights, translationHighlights],
  );

  const zoomEnabled = Boolean(fitScale);
  const canZoomIn = zoomLevel < MAX_ZOOM - 0.001;
  const canZoomOut = zoomLevel > MIN_ZOOM + 0.001;

  // Handlers
  const handlePageDimensionsChange = useCallback(
    (dimensions: PageDimensionsMap) => {
      setPageDimensionsMap(dimensions);
    },
    [],
  );

  const handleViewerReady = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setViewerReady(true);
      });
    });
  }, []);

  // Scroll to highlight ref
  useEffect(() => {
    if (!scrollToHighlightRef) return;

    scrollToHighlightRef.current = (highlightId: string) => {
      const highlight = extendedHighlights.find((h) => h.id === highlightId);
      if (highlight && highlighterUtilsRef.current) {
        highlighterUtilsRef.current.scrollToHighlight(highlight);
      }
    };

    return () => {
      scrollToHighlightRef.current = null;
    };
  }, [scrollToHighlightRef, extendedHighlights]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleFitWidth = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleToggleAreaSelection = useCallback(() => {
    setAreaSelectionMode((prev) => !prev);
  }, []);

  // Citation flash effect
  useEffect(() => {
    if (!activeCitation) {
      setCitationFlash(null);
      return;
    }

    const pageTextItems = textItemsMap?.get(activeCitation.page);
    if (!pageTextItems || pageTextItems.length === 0) {
      console.warn(
        `No text items found for page ${activeCitation.page}, cannot render citation flash`,
      );
      setCitationFlash(null);
      return;
    }

    const rects = offsetsToRects(activeCitation, pageTextItems);
    if (rects.length === 0) {
      console.warn("No rects computed for citation, cannot render flash");
      setCitationFlash(null);
      return;
    }

    setCitationFlash({
      pageNumber: activeCitation.page,
      rects,
    });
  }, [activeCitation, textItemsMap]);

  // Handle highlight creation
  const handleHighlightCreate = useCallback(
    (selection: PdfSelection, color: HighlightColor) => {
      const rects: HighlightRect[] = selection.position.rects.map((rect) => ({
        x: rect.x1 / rect.width,
        y: rect.y1 / rect.height,
        width: (rect.x2 - rect.x1) / rect.width,
        height: (rect.y2 - rect.y1) / rect.height,
      }));

      const tempHighlight: SupabaseHighlight = {
        id: `temp-${Date.now()}`,
        paperId,
        pageNumber: selection.position.boundingRect.pageNumber,
        startOffset: 0,
        endOffset: 0,
        selectedText: selection.content?.text || "",
        rects,
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onHighlightCreate?.(tempHighlight);
    },
    [paperId, onHighlightCreate],
  );

  // Handle highlight click - find original highlight
  const handleHighlightClick = useCallback(
    (highlightId: string) => {
      const originalHighlight = highlights.find((h) => h.id === highlightId);
      if (originalHighlight) {
        onHighlightClick?.(originalHighlight);
      }
    },
    [highlights, onHighlightClick],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ height: "100%", width: "100%", minHeight: "400px" }}
    >
      {/* Zoom Toolbar */}
      <ZoomToolbar
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitWidth={handleFitWidth}
        disableZoom={!zoomEnabled}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        areaSelectionMode={areaSelectionMode}
        onToggleAreaSelection={handleToggleAreaSelection}
        translationLanguage={translationLanguage}
        translationLanguageOptions={translationLanguageOptions}
        onTranslationLanguageChange={onTranslationLanguageChange}
      />

      {/* PDF Viewer */}
      {isMounted && (
        <PdfLoader
          document={pdfUrl}
          beforeLoad={() => <LoadingSpinner />}
          workerSrc="https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs"
          errorMessage={(error) => (
            <div className="flex items-center justify-center h-full text-destructive">
              Failed to load PDF: {error.message}
            </div>
          )}
        >
          {(pdfDocument) => (
            <PdfHighlighterInner
              pdfDocument={pdfDocument}
              areaSelectionMode={areaSelectionMode}
              scaleValue={scaleValue}
              viewerHighlights={viewerHighlights}
              highlighterUtilsRef={highlighterUtilsRef}
              onPageDimensionsChange={handlePageDimensionsChange}
              onViewerReady={handleViewerReady}
              onHighlightCreate={handleHighlightCreate}
              onHighlightClick={handleHighlightClick}
              onAskSelection={onAskSelection}
              onTranslateSelection={onTranslateSelection}
              onAskImage={onAskImage}
              onAreaHighlightCreate={onAreaHighlightCreate}
              onTranslationToggle={onTranslationToggle}
            />
          )}
        </PdfLoader>
      )}

      {/* Loading spinner while mounting */}
      {!isMounted && <LoadingSpinner />}

      {/* Citation flash overlay */}
      {citationFlash && (
        <CitationFlash
          rects={citationFlash.rects}
          pageNumber={citationFlash.pageNumber}
          onComplete={() => setCitationFlash(null)}
        />
      )}
    </div>
  );
}
