"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MouseEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type {
  Highlight,
  PdfHighlighterUtils,
  PdfSelection,
  GhostHighlight,
} from "react-pdf-highlighter-extended";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  useHighlightContainerContext,
  usePdfHighlighterContext,
} from "react-pdf-highlighter-extended";

import type { PdfHighlight, HighlightColor, HighlightRect } from "@/types/highlight";
import type { TranslationSelection } from "@/types/translation";
import type { PDFHighlighterViewerProps, PageDimensionsMap } from "./types";
import { HighlightTip } from "./HighlightTip";
import { AreaSelectionTip } from "./AreaSelectionTip";
import { CitationFlash } from "./CitationFlash";
import { ZoomToolbar } from "./ZoomToolbar";
import { TranslationLayer } from "./TranslationLayer";
import { offsetsToRects } from "@/lib/highlight-renderer";
import { cn } from "@/lib/utils";

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

// Extended Highlight type with color support
interface ColoredHighlight extends Highlight {
  color?: HighlightColor;
}

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
  highlight: PdfHighlight,
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

// Highlight container component - renders each highlight
interface HighlightContainerProps {
  onHighlightClick?: (highlightId: string) => void;
}

function HighlightContainer({ onHighlightClick }: HighlightContainerProps) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext<ColoredHighlight>();

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onHighlightClick?.(highlight.id);
    },
    [highlight.id, onHighlightClick],
  );

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
                format: "pdf",
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
  viewerHighlights: ColoredHighlight[];
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
      <HighlightContainer onHighlightClick={onHighlightClick} />
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
    const raf = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(raf);
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
    const raf = window.requestAnimationFrame(() => {
      setPageDimensionsMap(new Map());
      setZoomLevel(1);
      setViewerReady(false);
    });
    return () => window.cancelAnimationFrame(raf);
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

  // Convert highlights to extended format (translations are rendered separately via TranslationLayer)
  const extendedHighlights = useMemo(() => {
    if (!viewerReady || pageDimensionsMap.size === 0) return [];
    return highlights
      .map((h) => supabaseToExtendedHighlight(h, pageDimensionsMap))
      .filter((h): h is ColoredHighlight => h !== null);
  }, [highlights, pageDimensionsMap, viewerReady]);

  // Calculate scale for TranslationLayer positioning
  const currentScale = useMemo(() => {
    if (typeof scaleValue === "number") return scaleValue;
    return fitScale ?? 1;
  }, [scaleValue, fitScale]);

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
    const raf = window.requestAnimationFrame(() => {
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
    });

    return () => window.cancelAnimationFrame(raf);
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

      const tempHighlight: PdfHighlight = {
        id: `temp-${Date.now()}`,
        paperId,
        format: "pdf",
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
              viewerHighlights={extendedHighlights}
              highlighterUtilsRef={highlighterUtilsRef}
              onPageDimensionsChange={handlePageDimensionsChange}
              onViewerReady={handleViewerReady}
              onHighlightCreate={handleHighlightCreate}
              onHighlightClick={handleHighlightClick}
              onAskSelection={onAskSelection}
              onTranslateSelection={onTranslateSelection}
              onAskImage={onAskImage}
              onAreaHighlightCreate={onAreaHighlightCreate}
            />
          )}
        </PdfLoader>
      )}

      {/* Loading spinner while mounting */}
      {!isMounted && <LoadingSpinner />}

      {/* Translation Layer - rendered OUTSIDE react-pdf-highlighter for guaranteed opacity */}
      {viewerReady && translations.length > 0 && (
        <TranslationLayer
          translations={translations}
          pageDimensions={pageDimensionsMap}
          scale={currentScale}
          onToggle={onTranslationToggle}
        />
      )}

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
