"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PageLayout, TextSelection, OCRStatus } from "@/lib/ocr/types";
import SmartTextLayer from "./SmartTextLayer";
import SelectionToolbar from "./SelectionToolbar";
import { renderPageToImage } from "@/lib/ocr/page-to-image";
import {
  extractTextWithOlmOCR,
  checkLMStudioAvailable,
} from "@/lib/ocr/olmocr-client";
import { parseOCRToPageLayout } from "@/lib/ocr/layout-parser";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// PDF.js types - see src/types/pdfjs.d.ts for global declarations
import type { PDFDocumentProxy } from "@/types/pdfjs.d";

interface SmartPDFViewerProps {
  /** URL of the PDF file */
  pdfUrl: string;
  /** Initial scale */
  initialScale?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selection: TextSelection | null) => void;
  /** Callback when user wants to highlight */
  onHighlight?: (selection: TextSelection, color: string) => void;
  /** Callback when user wants to ask about selection */
  onAsk?: (selection: TextSelection) => void;
  /** Callback when user wants to translate */
  onTranslate?: (selection: TextSelection) => void;
  /** Show canvas background */
  showCanvasBackground?: boolean;
  /** CSS classes */
  className?: string;
}

/**
 * SmartPDFViewer
 *
 * A next-generation PDF viewer with:
 * - OCR-based text extraction (olmOCR via LMStudio)
 * - HTML-native text rendering
 * - Inline translation
 * - Precise highlighting
 * - Canvas background for figures (semi-transparent)
 */
export function SmartPDFViewer({
  pdfUrl,
  initialScale = 1.2,
  onSelectionChange,
  onHighlight,
  onAsk,
  onTranslate,
  showCanvasBackground: initialShowCanvas = true,
  className,
}: SmartPDFViewerProps) {
  // Core state
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialScale);
  const [pageLayouts, setPageLayouts] = useState<Map<number, PageLayout>>(
    new Map(),
  );
  const [currentSelection, setCurrentSelection] =
    useState<TextSelection | null>(null);
  const [showCanvasBackground, setShowCanvasBackground] =
    useState(initialShowCanvas);

  // OCR processing state
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>({
    paperId: pdfUrl,
    totalPages: 0,
    processedPages: 0,
    currentPage: 0,
    status: "idle",
  });
  const [lmStudioAvailable, setLmStudioAvailable] = useState<boolean | null>(
    null,
  );

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfjsLoadedRef = useRef(false);

  // Check LMStudio availability on mount
  useEffect(() => {
    const check = async () => {
      const available = await checkLMStudioAvailable();
      setLmStudioAvailable(available);
    };
    check();
  }, []);

  // Load PDF.js from CDN
  useEffect(() => {
    if (pdfjsLoadedRef.current) return;

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      pdfjsLoadedRef.current = true;
      loadPdf();
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Load PDF when URL changes
  const loadPdf = useCallback(async () => {
    if (!pdfUrl || !pdfjsLoadedRef.current) return;

    try {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) return;

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      setPdf(pdfDoc);
      setNumPages(pdfDoc.numPages);

      setOcrStatus((prev) => ({
        ...prev,
        totalPages: pdfDoc.numPages,
        status: "idle",
      }));

      // Start OCR processing
      if (lmStudioAvailable) {
        processAllPages(pdfDoc);
      }
    } catch (error) {
      console.error("Failed to load PDF:", error);
    }
  }, [pdfUrl, lmStudioAvailable]);

  // Process all pages with OCR
  const processAllPages = useCallback(
    async (pdfDoc: PDFDocumentProxy) => {
      if (!lmStudioAvailable) return;

      setOcrStatus((prev) => ({
        ...prev,
        status: "processing",
        currentPage: 1,
      }));

      const layouts = new Map<number, PageLayout>();

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          setOcrStatus((prev) => ({
            ...prev,
            currentPage: pageNum,
          }));

          // Render page to image
          const imageResult = await renderPageToImage(pdfDoc, pageNum);

          // Extract text with OCR
          const ocrResult = await extractTextWithOlmOCR({
            image: imageResult.imageBase64,
            metadata: {
              pageNumber: pageNum,
              totalPages: pdfDoc.numPages,
              width: imageResult.width,
              height: imageResult.height,
            },
          });

          // Parse OCR output to layout
          const layout = parseOCRToPageLayout(
            ocrResult.markdown,
            pageNum,
            imageResult.width,
            imageResult.height,
          );

          layouts.set(pageNum, layout);

          setPageLayouts(new Map(layouts));
          setOcrStatus((prev) => ({
            ...prev,
            processedPages: pageNum,
          }));
        } catch (error) {
          console.error(`OCR failed for page ${pageNum}:`, error);
          // Continue with next page
        }
      }

      setOcrStatus((prev) => ({
        ...prev,
        status: "completed",
      }));
    },
    [lmStudioAvailable],
  );

  // Render canvas background for a page
  const renderCanvasBackground = useCallback(
    async (pageNum: number) => {
      if (!pdf) return;

      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const context = canvas.getContext("2d");
      if (!context) return;

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(pixelRatio, pixelRatio);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    },
    [pdf, scale],
  );

  // Render all visible pages
  useEffect(() => {
    if (!pdf || !showCanvasBackground) return;

    const renderVisiblePages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        await renderCanvasBackground(pageNum);
      }
    };

    renderVisiblePages();
  }, [pdf, numPages, scale, showCanvasBackground, renderCanvasBackground]);

  // Handle selection
  const handleSelectionChange = useCallback(
    (selection: TextSelection | null) => {
      setCurrentSelection(selection);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  // Handle zoom
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  // Get base dimensions for a page
  const getPageDimensions = (pageNum: number) => {
    const layout = pageLayouts.get(pageNum);
    if (layout) {
      return { width: layout.width, height: layout.height };
    }
    // Default PDF page size
    return { width: 612, height: 792 };
  };

  return (
    <div className={cn("smart-pdf-viewer flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            -
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            +
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Canvas toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCanvasBackground((v) => !v)}
            title={
              showCanvasBackground
                ? "Hide PDF background"
                : "Show PDF background"
            }
          >
            {showCanvasBackground ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>

          {/* OCR status */}
          {ocrStatus.status === "processing" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                OCR: {ocrStatus.currentPage}/{ocrStatus.totalPages}
              </span>
              <Progress
                value={(ocrStatus.processedPages / ocrStatus.totalPages) * 100}
                className="w-24"
              />
            </div>
          )}

          {lmStudioAvailable === false && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">LMStudio not available</span>
            </div>
          )}
        </div>
      </div>

      {/* Pages container */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/50">
        <div className="flex flex-col items-center gap-4 py-4">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const { width, height } = getPageDimensions(pageNum);
            const layout = pageLayouts.get(pageNum);

            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                }}
                className="relative bg-white shadow-lg"
                style={{
                  width: width * scale,
                  height: height * scale,
                }}
                data-page-number={pageNum}
              >
                {/* Canvas background (semi-transparent) */}
                {showCanvasBackground && (
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                    }}
                    className={cn(
                      "absolute inset-0",
                      layout ? "opacity-30" : "opacity-100",
                    )}
                  />
                )}

                {/* Smart text layer */}
                {layout ? (
                  <SmartTextLayer
                    layout={layout}
                    scale={scale}
                    baseWidth={width}
                    baseHeight={height}
                    onSelectionChange={handleSelectionChange}
                  />
                ) : (
                  /* Loading placeholder */
                  <div className="absolute inset-0 flex items-center justify-center">
                    {ocrStatus.status === "processing" &&
                      ocrStatus.currentPage === pageNum && (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Processing page {pageNum}...
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {/* Page number */}
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  Page {pageNum} / {numPages}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection toolbar */}
      {currentSelection && (
        <SelectionToolbar
          selection={currentSelection}
          onHighlight={(color) => onHighlight?.(currentSelection, color)}
          onAsk={() => onAsk?.(currentSelection)}
          onTranslate={() => onTranslate?.(currentSelection)}
          onClose={() => setCurrentSelection(null)}
        />
      )}
    </div>
  );
}

export default SmartPDFViewer;
