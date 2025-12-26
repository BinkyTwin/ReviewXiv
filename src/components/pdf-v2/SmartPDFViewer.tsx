"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PageLayout, TextSelection } from "@/lib/ocr/types";
import SmartTextLayer from "./SmartTextLayer";
import SelectionToolbar from "./SelectionToolbar";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// PDF.js types
import type { PDFDocumentProxy } from "@/types/pdfjs.d";

interface DoclingServiceStatus {
  available: boolean;
  provider: string;
  url: string;
}

type ProcessingStatus =
  | "idle"
  | "checking"
  | "processing"
  | "completed"
  | "error";

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
 * PDF viewer with Docling-based text extraction:
 * - Precise text positions via BoundingBox
 * - Native table/formula detection
 * - HTML-native text rendering
 * - Semi-transparent canvas background
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

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [doclingStatus, setDoclingStatus] =
    useState<DoclingServiceStatus | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfjsLoadedRef = useRef(false);

  // Check Docling service availability
  useEffect(() => {
    const checkDocling = async () => {
      setStatus("checking");
      try {
        const response = await fetch("/api/docling");
        if (response.ok) {
          const data: DoclingServiceStatus = await response.json();
          setDoclingStatus(data);
          if (!data.available) {
            setErrorMessage("Docling service not running");
          }
        } else {
          setDoclingStatus({ available: false, provider: "docling", url: "" });
          setErrorMessage("Failed to check Docling service");
        }
      } catch {
        setDoclingStatus({ available: false, provider: "docling", url: "" });
        setErrorMessage("Cannot connect to API");
      }
      setStatus("idle");
    };
    checkDocling();
  }, []);

  // Load PDF.js from CDN
  useEffect(() => {
    if (pdfjsLoadedRef.current || typeof window === "undefined") return;

    if (window.pdfjsLib) {
      pdfjsLoadedRef.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
        pdfjsLoadedRef.current = true;
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Load PDF when URL changes
  useEffect(() => {
    if (!pdfUrl) return;

    const loadPdf = async () => {
      // Wait for PDF.js to load
      let attempts = 0;
      while (!window.pdfjsLib && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      if (!window.pdfjsLib) {
        setErrorMessage("PDF.js failed to load");
        return;
      }

      try {
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
      } catch (error) {
        console.error("Failed to load PDF:", error);
        setErrorMessage("Failed to load PDF");
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Process PDF with Docling when both PDF and service are ready
  useEffect(() => {
    if (
      !pdf ||
      !doclingStatus?.available ||
      status === "processing" ||
      status === "completed"
    ) {
      return;
    }

    const processWithDocling = async () => {
      setStatus("processing");
      setErrorMessage(null);

      try {
        // Call Docling API with PDF URL
        const response = await fetch("/api/docling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Docling processing failed");
        }

        const result = await response.json();

        // Convert layouts object to Map
        const layoutsMap = new Map<number, PageLayout>();
        for (const [pageNum, layout] of Object.entries(result.layouts)) {
          layoutsMap.set(parseInt(pageNum, 10), layout as PageLayout);
        }

        setPageLayouts(layoutsMap);
        setStatus("completed");
      } catch (error) {
        console.error("Docling processing failed:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Processing failed",
        );
        setStatus("error");
      }
    };

    processWithDocling();
  }, [pdf, doclingStatus?.available, pdfUrl, status]);

  // Render canvas background for a page
  const renderCanvasBackground = useCallback(
    async (pageNum: number) => {
      if (!pdf) return;

      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      try {
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
      } catch (error) {
        console.error(`Failed to render page ${pageNum}:`, error);
      }
    },
    [pdf, scale],
  );

  // Render all pages
  useEffect(() => {
    if (!pdf || !showCanvasBackground) return;

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        await renderCanvasBackground(pageNum);
      }
    };

    renderPages();
  }, [pdf, numPages, scale, showCanvasBackground, renderCanvasBackground]);

  // Handle selection
  const handleSelectionChange = useCallback(
    (selection: TextSelection | null) => {
      setCurrentSelection(selection);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  // Get page dimensions
  const getPageDimensions = (pageNum: number) => {
    const layout = pageLayouts.get(pageNum);
    if (layout) {
      return { width: layout.width, height: layout.height };
    }
    return { width: 612, height: 792 }; // Default PDF size
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
                ? "Masquer le fond PDF"
                : "Afficher le fond PDF"
            }
          >
            {showCanvasBackground ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>

          {/* Status indicator */}
          {status === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verification...</span>
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Traitement Docling...
              </span>
              <Progress value={50} className="w-24" />
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{numPages} pages</span>
            </div>
          )}

          {(status === "error" || doclingStatus?.available === false) && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {errorMessage || "Docling indisponible"}
              </span>
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
                {/* Canvas background */}
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    {status === "processing" && (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Analyse en cours...
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
