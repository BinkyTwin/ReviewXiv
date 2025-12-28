"use client";

import {
  Children,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
// Note: rehype-sanitize removed - it was stripping data URIs for images
import type { MistralPage } from "@/lib/mistral-ocr/types";
import type { Highlight, HighlightRect } from "@/types/highlight";
import type { Citation } from "@/types/citation";
import {
  HighlightLayer,
  CitationLayer,
  TranslationLayer,
  CanvasLayer,
  PDFTextLayer,
  type HighlightData,
  type CitationHighlight,
  type InlineTranslation,
} from "@/components/reader/layers";
import { usePDFDocument } from "@/components/reader/hooks";
import type { PageData } from "@/types/pdf";

interface MistralServiceStatus {
  available: boolean;
  provider: string;
  model: string;
}

export interface SmartSelectionData {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  position: { x: number; y: number };
  rects: HighlightRect[];
}

type ProcessingStatus =
  | "idle"
  | "checking"
  | "processing"
  | "completed"
  | "error";

/**
 * Rendering mode for the PDF viewer
 * - "markdown": Use Mistral OCR markdown rendering (current default)
 * - "canvas": Use PDF.js canvas rendering with text layer
 * - "hybrid": Auto-select based on page content (canvas for text pages, markdown for scanned)
 */
export type RenderMode = "markdown" | "canvas" | "hybrid";

interface SmartPDFViewerProps {
  pdfUrl: string;
  initialScale?: number;
  className?: string;
  /** Rendering mode (default: "markdown") */
  renderMode?: RenderMode;
  /** Persistent highlights to display */
  highlights?: Highlight[];
  /** Active citation to flash (from AI chat) */
  activeCitation?: Citation | null;
  /** Inline translations to display */
  inlineTranslations?: InlineTranslation[];
  /** Callback when a highlight is clicked */
  onHighlightClick?: (highlight: Highlight) => void;
  /** Callback when text is selected */
  onTextSelect?: (selection: SmartSelectionData | null) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when translation toggle is clicked */
  onTranslationToggle?: (translationId: string) => void;
}

const getElementChildren = (node: ReactNode): ReactNode | undefined =>
  isValidElement<{ children?: ReactNode }>(node)
    ? node.props.children
    : undefined;

/**
 * SmartPDFViewer - Hybrid PDF viewer with OCR fallback
 *
 * Supports three rendering modes:
 * - "markdown": Uses Mistral OCR for all pages (current default)
 * - "canvas": Uses PDF.js canvas + text layer for all pages
 * - "hybrid": Auto-selects based on page content
 */
export const SmartPDFViewer = memo(function SmartPDFViewer({
  pdfUrl,
  initialScale = 1,
  className,
  renderMode = "markdown",
  highlights = [],
  activeCitation,
  inlineTranslations = [],
  onHighlightClick,
  onTextSelect,
  onPageChange,
  onTranslationToggle,
}: SmartPDFViewerProps) {
  const [scale, setScale] = useState(initialScale);
  const [pages, setPages] = useState<MistralPage[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mistralStatus, setMistralStatus] =
    useState<MistralServiceStatus | null>(null);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  // Load PDF.js document for canvas/hybrid modes
  const {
    pages: pdfPages,
    pageDataMap,
    numPages: pdfNumPages,
    isLoading: pdfLoading,
    error: pdfError,
    pdfjsLoaded,
  } = usePDFDocument({
    pdfUrl,
    fetchTextItems: renderMode !== "markdown",
  });

  // Check Mistral service availability
  useEffect(() => {
    const checkMistral = async () => {
      setStatus("checking");
      try {
        const response = await fetch("/api/mistral-ocr");
        if (response.ok) {
          const data: MistralServiceStatus = await response.json();
          setMistralStatus(data);
          if (!data.available) {
            setErrorMessage("Mistral OCR not configured");
          }
        } else {
          setMistralStatus({
            available: false,
            provider: "mistral",
            model: "",
          });
          setErrorMessage("Failed to check Mistral service");
        }
      } catch {
        setMistralStatus({ available: false, provider: "mistral", model: "" });
        setErrorMessage("Cannot connect to API");
      }
      setStatus("idle");
    };
    checkMistral();
  }, []);

  // Process PDF with Mistral
  useEffect(() => {
    if (
      !pdfUrl ||
      !mistralStatus?.available ||
      status === "processing" ||
      status === "completed" ||
      status === "error" ||
      processedRef.current
    ) {
      return;
    }

    const processWithMistral = async () => {
      processedRef.current = true;
      setStatus("processing");
      setErrorMessage(null);
      setProgress(10);

      try {
        const response = await fetch("/api/mistral-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentUrl: pdfUrl,
            includeImages: true,
          }),
        });

        setProgress(50);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Mistral OCR processing failed");
        }

        const result = await response.json();
        setProgress(90);

        setPages(result.pages || []);
        setStatus("completed");
        setProgress(100);
      } catch (error) {
        console.error("Mistral OCR processing failed:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Processing failed",
        );
        setStatus("error");
        processedRef.current = false;
      }
    };

    processWithMistral();
  }, [pdfUrl, mistralStatus?.available, status]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));

  return (
    <div className={cn("smart-pdf-viewer flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {status === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Vérification...</span>
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Analyse OCR...
              </span>
              <Progress value={progress} className="w-24" />
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">{pages.length} pages</span>
            </div>
          )}

          {(status === "error" || mistralStatus?.available === false) && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errorMessage || "Erreur"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: "#525659" }}
      >
        <div className="flex flex-col items-center gap-8 py-8 px-4">
          {/* Loading state for markdown mode */}
          {renderMode === "markdown" &&
            status === "processing" &&
            pages.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <span className="text-white/80 text-lg">
                  Analyse du document...
                </span>
                <Progress value={progress} className="w-64" />
              </div>
            )}

          {/* Loading state for canvas/hybrid mode */}
          {renderMode !== "markdown" && pdfLoading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <span className="text-white/80 text-lg">
                Chargement du document...
              </span>
            </div>
          )}

          {/* Canvas/Hybrid mode rendering */}
          {renderMode !== "markdown" && !pdfLoading && pdfPages.size > 0 && (
            <>
              {Array.from({ length: pdfNumPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  const pdfPage = pdfPages.get(pageNum);
                  const pageData = pageDataMap.get(pageNum);

                  // In hybrid mode, fall back to markdown if page has no text
                  const shouldUseMarkdown =
                    renderMode === "hybrid" && pageData && !pageData.hasText;

                  // Get corresponding Mistral page for hybrid fallback
                  const mistralPage = shouldUseMarkdown
                    ? pages.find((p) => p.index === pageNum - 1)
                    : null;

                  // Filter highlights for this page
                  const pageHighlights: HighlightData[] = highlights
                    .filter((h) => h.pageNumber === pageNum)
                    .map((h) => ({
                      id: h.id,
                      rects: h.rects,
                      color: h.color,
                      text: h.selectedText,
                      hasAnnotation: !!h.note,
                    }));

                  // Prepare citation for this page if active
                  const pageCitation: CitationHighlight | null =
                    activeCitation && activeCitation.page === pageNum
                      ? { id: `citation-${pageNum}`, rects: [] }
                      : null;

                  // Filter translations for this page
                  const pageTranslations = inlineTranslations.filter(
                    (t) => t.pageNumber === pageNum,
                  );

                  // Use markdown rendering for scanned pages in hybrid mode
                  if (shouldUseMarkdown && mistralPage) {
                    return (
                      <PageCanvas
                        key={`markdown-${pageNum}`}
                        page={mistralPage}
                        scale={scale}
                        pageNumber={pageNum}
                        pageHighlights={pageHighlights}
                        pageCitation={pageCitation}
                        pageTranslations={pageTranslations}
                        onHighlightClick={(highlightId) => {
                          const highlight = highlights.find(
                            (h) => h.id === highlightId,
                          );
                          if (highlight) onHighlightClick?.(highlight);
                        }}
                        onTextSelect={onTextSelect}
                        onTranslationToggle={onTranslationToggle}
                      />
                    );
                  }

                  // Canvas rendering for pages with extractable text
                  if (pdfPage && pageData) {
                    return (
                      <CanvasPage
                        key={`canvas-${pageNum}`}
                        pdfPage={pdfPage}
                        pageData={pageData}
                        scale={scale}
                        pageNumber={pageNum}
                        pageHighlights={pageHighlights}
                        pageCitation={pageCitation}
                        pageTranslations={pageTranslations}
                        onHighlightClick={(highlightId) => {
                          const highlight = highlights.find(
                            (h) => h.id === highlightId,
                          );
                          if (highlight) onHighlightClick?.(highlight);
                        }}
                        onTextSelect={onTextSelect}
                        onTranslationToggle={onTranslationToggle}
                      />
                    );
                  }

                  return null;
                },
              )}
            </>
          )}

          {/* Markdown mode rendering (original behavior) */}
          {renderMode === "markdown" &&
            pages.map((page) => {
              const pageNum = page.index + 1;

              // Filter highlights for this page
              const pageHighlights: HighlightData[] = highlights
                .filter((h) => h.pageNumber === pageNum)
                .map((h) => ({
                  id: h.id,
                  rects: h.rects,
                  color: h.color,
                  text: h.selectedText,
                  hasAnnotation: !!h.note,
                }));

              // Prepare citation for this page if active
              const pageCitation: CitationHighlight | null =
                activeCitation && activeCitation.page === pageNum
                  ? {
                      id: `citation-${pageNum}`,
                      rects: [], // Rects will be computed by parent component
                    }
                  : null;

              // Filter translations for this page
              const pageTranslations = inlineTranslations.filter(
                (t) => t.pageNumber === pageNum,
              );

              return (
                <PageCanvas
                  key={page.index}
                  page={page}
                  scale={scale}
                  pageNumber={pageNum}
                  pageHighlights={pageHighlights}
                  pageCitation={pageCitation}
                  pageTranslations={pageTranslations}
                  onHighlightClick={(highlightId) => {
                    const highlight = highlights.find(
                      (h) => h.id === highlightId,
                    );
                    if (highlight) {
                      onHighlightClick?.(highlight);
                    }
                  }}
                  onTextSelect={onTextSelect}
                  onTranslationToggle={onTranslationToggle}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
});

/**
 * Page Canvas Component - Renders a page like real A4 paper
 */
interface PageCanvasProps {
  page: MistralPage;
  scale: number;
  pageNumber: number;
  /** Highlights for this page */
  pageHighlights: HighlightData[];
  /** Active citation for this page */
  pageCitation: CitationHighlight | null;
  /** Inline translations for this page */
  pageTranslations: InlineTranslation[];
  /** Callback when a highlight is clicked */
  onHighlightClick?: (highlightId: string) => void;
  /** Callback when text is selected */
  onTextSelect?: (selection: SmartSelectionData | null) => void;
  /** Callback when translation toggle is clicked */
  onTranslationToggle?: (translationId: string) => void;
}

// Fallback A4 dimensions in pixels at 96 DPI (standard screen)
const A4_WIDTH_PX = 794; // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

function PageCanvas({
  page,
  scale,
  pageNumber,
  pageHighlights,
  pageCitation,
  pageTranslations,
  onHighlightClick,
  onTextSelect,
  onTranslationToggle,
}: PageCanvasProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(
    null,
  );

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !onTextSelect) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onTextSelect(null);
      return;
    }

    // Get selection position for popover
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate character offset within the page content
    // For now, we use a simplified approach - full offset calculation
    // would require tracking text positions from Mistral OCR
    const pageElement = pageRef.current;
    const contentElement = contentRef.current;
    if (
      !pageElement ||
      !contentElement ||
      !contentElement.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    // Walk through text nodes to calculate offset
    const walker = document.createTreeWalker(
      contentElement,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let charCount = 0;
    let startOffset = 0;
    let endOffset = 0;
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent?.length || 0;

      if (node === range.startContainer) {
        startOffset = charCount + range.startOffset;
      }

      if (node === range.endContainer) {
        endOffset = charCount + range.endOffset;
        break;
      }

      charCount += nodeLength;
    }

    const selectionRects = getSelectionRects(range, pageElement);

    onTextSelect({
      pageNumber,
      startOffset,
      endOffset,
      selectedText,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
      rects: selectionRects,
    });
  }, [pageNumber, onTextSelect]);

  // Utility function to clean and improve text punctuation
  const cleanText = (text: string): string => {
    if (typeof text !== "string") return "";

    return (
      text
        // Fix multiple spaces
        .replace(/\s+/g, " ")
        // Ensure proper spacing after punctuation
        .replace(/([.,;:!?])(\w)/g, "$1 $2")
        // Fix spacing around quotes
        .replace(/(\w)(")/g, "$1 $2")
        .replace(/(")(\w)/g, "$1 $2")
        // Fix spacing around parentheses
        .replace(/(\w)([()])/g, "$1 $2")
        .replace(/([()])(\w)/g, "$1 $2")
        // Fix spacing around brackets
        .replace(/(\w)(\[|\])/g, "$1 $2")
        .replace(/(\[|\])(\w)/g, "$1 $2")
        // Fix spacing around braces
        .replace(/(\w)(\{|\})/g, "$1 $2")
        .replace(/(\{|\})(\w)/g, "$1 $2")
        // Fix common OCR errors
        .replace(/(\w)(\.)(\w)/g, "$1. $3") // Add space after period
        .replace(/(\w)(,)(\w)/g, "$1, $3") // Add space after comma
        .replace(/(\w)(;)(\w)/g, "$1; $3") // Add space after semicolon
        .replace(/(\w)(:)(\w)/g, "$1: $3") // Add space after colon
        // Fix common French punctuation
        .replace(/(\w)(\?)(\w)/g, "$1? $3") // Add space after question mark
        .replace(/(\w)(!)(\w)/g, "$1! $3") // Add space after exclamation mark
        // Fix French quotes
        .replace(/(\w)(\«)/g, "$1 $2") // Add space before French opening quote
        .replace(/(\»)(\w)/g, "$1 $2") // Add space after French closing quote
        // Fix common OCR artifacts
        .replace(/(\w)(\')(\w)/g, "$1'$3") // Fix apostrophes in contractions
        .replace(/(\w)(\-\-)(\w)/g, "$1 - $3") // Fix double hyphens
        // Trim whitespace
        .trim()
    );
  };

  // Build image map for replacing markdown image references
  const imageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (page.images) {
      for (const img of page.images) {
        if (img.image_base64) {
          // Map multiple variations of the image name
          const baseName = img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, "");

          // Check if base64 already has data URI prefix
          const dataUri = img.image_base64.startsWith("data:")
            ? img.image_base64
            : `data:image/jpeg;base64,${img.image_base64}`;

          // Map all possible variations of the image reference
          map.set(img.id, dataUri);
          map.set(baseName, dataUri);
          map.set(img.id.toLowerCase(), dataUri);
          map.set(baseName.toLowerCase(), dataUri);
          map.set(img.id.toUpperCase(), dataUri);
          map.set(baseName.toUpperCase(), dataUri);
          // Handle paths with different prefixes
          map.set(`./${img.id}`, dataUri);
          map.set(`../${img.id}`, dataUri);
          map.set(`/${img.id}`, dataUri);
          map.set(`./${baseName}`, dataUri);
          map.set(`../${baseName}`, dataUri);
          map.set(`/${baseName}`, dataUri);
          // Handle image references with query parameters
          map.set(`${img.id}?raw=true`, dataUri);
          map.set(`${baseName}?raw=true`, dataUri);

          // Handle common OCR image naming patterns
          map.set(`img-${img.id}`, dataUri);
          map.set(`figure-${img.id}`, dataUri);
          map.set(`fig-${img.id}`, dataUri);
          map.set(`image-${img.id}`, dataUri);

          // Handle image references with different extensions
          map.set(
            img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, ".png"),
            dataUri,
          );
          map.set(
            img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, ".jpg"),
            dataUri,
          );
          map.set(
            img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, ".jpeg"),
            dataUri,
          );

          // Handle image references with size suffixes
          map.set(img.id.replace(/(\.\w+)$/, "-small$1"), dataUri);
          map.set(img.id.replace(/(\.\w+)$/, "-thumb$1"), dataUri);
          map.set(img.id.replace(/(\.\w+)$/, "-large$1"), dataUri);
        }
      }
    }
    return map;
  }, [page.images]);

  // Process markdown to improve fidelity
  const processedMarkdown = useMemo(() => {
    let markdown = page.markdown || "";

    // ===== PHASE 1: Remove malformed objects and artifacts =====
    // Remove [object Object] in all variations
    markdown = markdown
      .replace(/\[\s*object\s+Object\s*\]/gi, "")
      .replace(/\(\s*object\s+Object\s*\)/gi, "")
      .replace(/\{\s*object\s+Object\s*\}/gi, "")
      .replace(/\bObject\s*,?\s*Object\b/gi, "")
      .replace(/\[object\s+\w+\]/gi, "") // [object Array], [object Map], etc.
      .replace(/,\s*object Object\s*,?/gi, ",")
      .replace(/^\s*object Object\s*$/gim, "")
      // Remove empty markdown links/images left after artifact removal
      .replace(/\[\s*\]\(\s*\)/g, "")
      .replace(/!\[\s*\]\(\s*\)/g, "");

    // ===== PHASE 2: Fix markdown structure =====
    // Ensure headers have proper spacing
    markdown = markdown.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");
    markdown = markdown.replace(/(\n#{1,6})([^\s#])/g, "$1 $2");

    // Fix list items with missing spaces
    markdown = markdown.replace(/^(\*|\-|\+)([^\s\*\-\+])/gm, "$1 $2");
    markdown = markdown.replace(/^(\d+\.)([^\s])/gm, "$1 $2");
    markdown = markdown.replace(/(\n\*|\n\-|\n\+)([^\s\*\-\+])/g, "$1 $2");
    markdown = markdown.replace(/(\n\d+\.)([^\s])/g, "$1 $2");

    // ===== PHASE 3: Fix punctuation and spacing =====
    // Add spaces after punctuation if missing (but not in URLs or numbers)
    markdown = markdown.replace(/([.,;:!?])([a-zA-ZÀ-ÿ])/g, "$1 $2");

    // Fix spacing around parentheses (careful with markdown links)
    markdown = markdown.replace(/([a-zA-ZÀ-ÿ])(\()/g, "$1 $2");
    markdown = markdown.replace(/(\))([a-zA-ZÀ-ÿ])/g, "$1 $2");

    // Fix spacing around quotes
    markdown = markdown.replace(/([a-zA-ZÀ-ÿ])(")/g, "$1 $2");
    markdown = markdown.replace(/(")([a-zA-ZÀ-ÿ])/g, "$1 $2");

    // Fix French punctuation (space before : ; ? !)
    markdown = markdown.replace(/([a-zA-ZÀ-ÿ])([;:?!])/g, "$1 $2");

    // Fix French quotes
    markdown = markdown.replace(/([a-zA-ZÀ-ÿ])(«)/g, "$1 $2");
    markdown = markdown.replace(/(»)([a-zA-ZÀ-ÿ])/g, "$1 $2");

    // ===== PHASE 4: Clean up whitespace and artifacts =====
    // Fix multiple consecutive newlines
    markdown = markdown.replace(/\n{4,}/g, "\n\n\n");

    // Collapse multiple spaces (but preserve code blocks)
    markdown = markdown.replace(/([^`\n])[ \t]{2,}([^`])/g, "$1 $2");

    // Remove trailing spaces per line
    markdown = markdown.replace(/[ \t]+$/gm, "");

    // Clean up comma artifacts
    markdown = markdown.replace(/,\s*,+/g, ",");
    markdown = markdown.replace(/\s+,/g, ",");
    markdown = markdown.replace(/,(\s*\n)/g, "$1");

    // Remove orphaned punctuation on its own line
    markdown = markdown.replace(/^\s*[.,;:]+\s*$/gm, "");

    // Fix double punctuation
    markdown = markdown.replace(/([.!?])\1+/g, "$1");
    markdown = markdown.replace(/,\.+/g, ".");

    // Remove empty list items
    markdown = markdown.replace(/^[\*\-\+]\s*$/gm, "");
    markdown = markdown.replace(/^\d+\.\s*$/gm, "");

    // Trim overall
    markdown = markdown.trim();

    return markdown;
  }, [page.markdown]);

  // Calculate scaled dimensions
  const baseWidth = page.dimensions?.width || A4_WIDTH_PX;
  const baseHeight = page.dimensions?.height || A4_HEIGHT_PX;
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;
  const paddingX = Math.round(baseWidth * 0.07 * scale);
  const paddingY = Math.round(baseHeight * 0.045 * scale);

  return (
    <div
      ref={pageRef}
      className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      style={{
        width: scaledWidth,
        minHeight: scaledHeight,
        maxWidth: "95vw",
      }}
      data-page-number={pageNumber}
      onMouseUp={handleMouseUp}
    >
      {/* Highlight Layer - z-index 20 */}
      <HighlightLayer
        highlights={pageHighlights}
        onHighlightClick={onHighlightClick}
        onHighlightHover={setHoveredHighlightId}
        hoveredHighlightId={hoveredHighlightId}
      />

      {/* Translation Layer - z-index 40 */}
      <TranslationLayer
        translations={pageTranslations}
        scale={scale}
        onToggle={onTranslationToggle}
      />

      {/* Citation Layer - z-index 50 */}
      <CitationLayer citation={pageCitation} />

      {/* Page content */}
      <article
        ref={contentRef}
        className="relative select-text"
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          fontSize: `${14 * scale}px`,
          lineHeight: 1.6,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeSlug, rehypeAutolinkHeadings]}
          components={{
            // Images - resolve from imageMap and render full width with better error handling
            img: ({ src, alt }) => {
              const originalSrc = typeof src === "string" ? src : "";
              const cleanSrc = originalSrc
                ? originalSrc.replace(/^\.?\//, "")
                : "";

              // Try to resolve from imageMap - more comprehensive search
              const resolvedSrc =
                imageMap.get(originalSrc) ||
                imageMap.get(cleanSrc) ||
                imageMap.get(originalSrc.toLowerCase()) ||
                imageMap.get(cleanSrc.toLowerCase()) ||
                imageMap.get(originalSrc.toUpperCase()) ||
                imageMap.get(cleanSrc.toUpperCase()) ||
                imageMap.get(originalSrc.replace(/\?.*$/, "")) ||
                imageMap.get(cleanSrc.replace(/\?.*$/, "")) ||
                // Try to find by alt text if available
                (alt && imageMap.get(alt)) ||
                (alt && imageMap.get(alt.toLowerCase()));

              if (!resolvedSrc) {
                // No image data available, show improved placeholder
                console.warn(`Image not found: ${originalSrc}`, {
                  alt,
                  availableImages: Array.from(imageMap.keys()),
                });
                return (
                  <div className="block my-6 p-6 bg-slate-50 border-2 border-slate-200 border-dashed text-slate-500 text-center rounded-lg">
                    <div className="text-sm font-medium text-slate-600 mb-2">
                      📷 IMAGE NOT AVAILABLE
                    </div>
                    <div className="text-xs break-words max-w-full">
                      {alt ? (
                        <>
                          <div className="font-medium">Alt text:</div>
                          <div className="mt-1">{cleanText(alt)}</div>
                        </>
                      ) : (
                        originalSrc || "Unknown image reference"
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="block my-6">
                  <img
                    src={resolvedSrc}
                    alt={alt || "Document image"}
                    className="w-full h-auto rounded-sm shadow-sm"
                    style={{ maxWidth: "100%" }}
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Failed to load image: ${originalSrc}`);
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              );
            },
            // Tables with improved styling and error handling
            table: ({ children }) => {
              // Check if table has valid content
              const hasContent = Children.count(children) > 0;

              if (!hasContent) {
                return (
                  <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-sm text-slate-500 text-center">
                    <div className="text-sm">📊 Empty table</div>
                  </div>
                );
              }

              // Count actual rows to ensure table has meaningful content
              let rowCount = 0;
              Children.forEach(children, (child) => {
                if (
                  isValidElement(child) &&
                  (child.type === "thead" || child.type === "tbody")
                ) {
                  Children.forEach(getElementChildren(child), (row) => {
                    if (isValidElement(row) && row.type === "tr") {
                      rowCount++;
                    }
                  });
                }
              });

              if (rowCount === 0) {
                return (
                  <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-sm text-slate-500 text-center">
                    <div className="text-sm">📊 Table has no data</div>
                  </div>
                );
              }

              // Count cells to ensure table has meaningful content
              let cellCount = 0;
              Children.forEach(children, (child) => {
                if (
                  isValidElement(child) &&
                  (child.type === "thead" || child.type === "tbody")
                ) {
                  Children.forEach(getElementChildren(child), (row) => {
                    if (isValidElement(row) && row.type === "tr") {
                      Children.forEach(getElementChildren(row), (cell) => {
                        if (
                          isValidElement(cell) &&
                          (cell.type === "th" || cell.type === "td")
                        ) {
                          cellCount++;
                        }
                      });
                    }
                  });
                }
              });

              if (cellCount === 0) {
                return (
                  <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-sm text-slate-500 text-center">
                    <div className="text-sm">📊 Table has no cells</div>
                  </div>
                );
              }

              // Count non-empty cells to ensure table has meaningful content
              let nonEmptyCellCount = 0;
              Children.forEach(children, (child) => {
                if (
                  isValidElement(child) &&
                  (child.type === "thead" || child.type === "tbody")
                ) {
                  Children.forEach(getElementChildren(child), (row) => {
                    if (isValidElement(row) && row.type === "tr") {
                      Children.forEach(getElementChildren(row), (cell) => {
                        if (
                          isValidElement(cell) &&
                          (cell.type === "th" || cell.type === "td")
                        ) {
                          const cellContent = getElementChildren(cell);
                          const hasCellContent =
                            cellContent &&
                            cellContent.toString().trim().length > 0;
                          if (hasCellContent) {
                            nonEmptyCellCount++;
                          }
                        }
                      });
                    }
                  });
                }
              });

              if (nonEmptyCellCount === 0) {
                return (
                  <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-sm text-slate-500 text-center">
                    <div className="text-sm">📊 Table has no content</div>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto my-6 border border-slate-200 rounded-sm">
                  <table className="w-full border-collapse text-[0.9em]">
                    {children}
                  </table>
                </div>
              );
            },
            thead: ({ children }) => {
              const hasContent = Children.count(children) > 0;

              if (!hasContent) {
                return null;
              }

              // Count actual header cells to ensure thead has meaningful content
              let cellCount = 0;
              Children.forEach(children, (child) => {
                if (isValidElement(child) && child.type === "tr") {
                  Children.forEach(getElementChildren(child), (cell) => {
                    if (isValidElement(cell) && cell.type === "th") {
                      cellCount++;
                    }
                  });
                }
              });

              if (cellCount === 0) {
                return null;
              }

              // Count non-empty header cells to ensure thead has meaningful content
              let nonEmptyCellCount = 0;
              Children.forEach(children, (child) => {
                if (isValidElement(child) && child.type === "tr") {
                  Children.forEach(getElementChildren(child), (cell) => {
                    if (isValidElement(cell) && cell.type === "th") {
                      const cellContent = getElementChildren(cell);
                      const hasCellContent =
                        cellContent && cellContent.toString().trim().length > 0;
                      if (hasCellContent) {
                        nonEmptyCellCount++;
                      }
                    }
                  });
                }
              });

              if (nonEmptyCellCount === 0) {
                return null;
              }

              return (
                <thead className="bg-slate-50 border-b border-slate-300">
                  {children}
                </thead>
              );
            },
            th: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <th className="px-4 py-3 text-left font-semibold text-slate-900 border border-slate-200 bg-slate-50 sticky top-0 hyphens-auto">
                  {hasContent ? (
                    formattedContent
                  ) : (
                    <span className="text-slate-400 italic">N/A</span>
                  )}
                </th>
              );
            },
            td: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <td className="px-4 py-3 text-slate-800 border border-slate-200 hyphens-auto">
                  {hasContent ? (
                    formattedContent
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>
              );
            },
            // Headings - professional document style with improved hierarchy
            h1: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h1 className="text-[2em] font-bold text-slate-900 mb-6 mt-8 first:mt-0 border-b-2 border-slate-300 pb-3 leading-tight">
                  {formattedContent}
                </h1>
              );
            },
            h2: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h2 className="text-[1.6em] font-bold text-slate-800 mb-4 mt-6 border-b border-slate-200 pb-1 leading-snug">
                  {formattedContent}
                </h2>
              );
            },
            h3: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h3 className="text-[1.3em] font-semibold text-slate-800 mb-3 mt-5 font-medium">
                  {formattedContent}
                </h3>
              );
            },
            h4: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h4 className="text-[1.15em] font-semibold text-slate-700 mb-2 mt-4 font-medium italic">
                  {formattedContent}
                </h4>
              );
            },
            h5: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h5 className="text-[1.05em] font-medium text-slate-700 mb-2 mt-3">
                  {formattedContent}
                </h5>
              );
            },
            h6: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty headings
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <h6 className="text-[1em] font-medium text-slate-600 mb-1 mt-2">
                  {formattedContent}
                </h6>
              );
            },
            // Paragraphs with improved typography
            p: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty paragraphs
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <p className="text-slate-800 mb-4 text-justify leading-relaxed hyphens-auto">
                  {formattedContent}
                </p>
              );
            },
            // Lists with better spacing and styling
            ul: ({ children }) => {
              const hasContent = Children.count(children) > 0;

              if (!hasContent) {
                return null; // Don't render empty lists
              }

              return (
                <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-800 marker:text-slate-500">
                  {children}
                </ul>
              );
            },
            ol: ({ children }) => {
              const hasContent = Children.count(children) > 0;

              if (!hasContent) {
                return null; // Don't render empty lists
              }

              return (
                <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-800 marker:text-slate-500 marker:font-medium">
                  {children}
                </ol>
              );
            },
            li: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty list items
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <li className="text-slate-800 mb-1 leading-relaxed hyphens-auto">
                  {formattedContent}
                </li>
              );
            },
            // Code blocks with improved styling
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              const content =
                typeof children === "string" ? children.trim() : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty code blocks
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return isBlock ? (
                <code className="block bg-slate-900 text-slate-50 p-4 rounded-md text-[0.85em] font-mono overflow-x-auto shadow-sm">
                  {formattedContent}
                </code>
              ) : (
                <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[0.9em] font-mono border border-slate-200">
                  {formattedContent}
                </code>
              );
            },
            pre: ({ children }) => {
              const hasContent = Children.count(children) > 0;

              if (!hasContent) {
                return null; // Don't render empty pre elements
              }

              return (
                <pre className="my-4 overflow-x-auto rounded-md">
                  {children}
                </pre>
              );
            },
            // Blockquote with improved styling
            blockquote: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty blockquotes
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <blockquote className="border-l-4 border-blue-300 pl-5 py-2 my-4 bg-blue-50 text-slate-800 not-italic rounded-r-md hyphens-auto">
                  {formattedContent}
                </blockquote>
              );
            },
            // Links with improved styling
            a: ({ href, children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;
              const hasValidHref =
                href && href.toString().trim().length > 0 && href !== "#";

              if (!hasContent || !hasValidHref) {
                return null; // Don't render empty or invalid links
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors duration-150 break-words"
                >
                  {formattedContent}
                </a>
              );
            },
            // Horizontal rule with improved styling
            hr: () => {
              // Always render hr as it's a structural element
              return <hr className="my-8 border-slate-300 border-t-2" />;
            },
            // Strong/bold with improved styling
            strong: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty strong elements
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <strong className="font-bold text-slate-900 tracking-wide hyphens-auto">
                  {formattedContent}
                </strong>
              );
            },
            // Emphasis/italic with improved styling
            em: ({ children }) => {
              const content =
                typeof children === "string" ? cleanText(children) : children;
              const hasContent =
                content && content.toString().trim().length > 0;

              if (!hasContent) {
                return null; // Don't render empty em elements
              }

              // Ensure content is properly formatted
              const formattedContent = isValidElement(content)
                ? content
                : cleanText(String(content ?? ""));

              return (
                <em className="italic text-slate-700 font-medium hyphens-auto">
                  {formattedContent}
                </em>
              );
            },
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </article>

      {/* Subtle page number at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 text-center pb-4 text-slate-400 text-xs"
        style={{ fontSize: `${10 * scale}px` }}
      >
        {pageNumber}
      </div>
    </div>
  );
}

function getSelectionRects(
  range: Range,
  pageElement: HTMLDivElement,
): HighlightRect[] {
  const pageRect = pageElement.getBoundingClientRect();
  if (pageRect.width === 0 || pageRect.height === 0) {
    return [];
  }

  const rects = Array.from(range.getClientRects())
    .map((rect) => normalizeRect(rect, pageRect))
    .filter((rect): rect is HighlightRect => rect !== null);

  if (rects.length === 0) {
    const fallbackRect = normalizeRect(range.getBoundingClientRect(), pageRect);
    if (fallbackRect) {
      rects.push(fallbackRect);
    }
  }

  return mergeSelectionRects(rects);
}

function normalizeRect(rect: DOMRect, pageRect: DOMRect): HighlightRect | null {
  const left = Math.max(rect.left, pageRect.left);
  const right = Math.min(rect.right, pageRect.right);
  const top = Math.max(rect.top, pageRect.top);
  const bottom = Math.min(rect.bottom, pageRect.bottom);

  if (right <= left || bottom <= top) {
    return null;
  }

  const width = right - left;
  const height = bottom - top;

  return {
    x: (left - pageRect.left) / pageRect.width,
    y: (top - pageRect.top) / pageRect.height,
    width: width / pageRect.width,
    height: height / pageRect.height,
  };
}

function mergeSelectionRects(rects: HighlightRect[]): HighlightRect[] {
  if (rects.length === 0) return [];

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: HighlightRect[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const sameLine = Math.abs(next.y - current.y) < 0.01;
    const adjacent = next.x <= current.x + current.width + 0.01;

    if (sameLine && adjacent) {
      current = {
        x: current.x,
        y: current.y,
        width:
          Math.max(current.x + current.width, next.x + next.width) - current.x,
        height: Math.max(current.height, next.height),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * CanvasPage Component - Renders a page using PDF.js canvas
 * Used in canvas and hybrid rendering modes
 */
interface CanvasPageProps {
  pdfPage: PDFPageProxyLocal;
  pageData: PageData;
  scale: number;
  pageNumber: number;
  pageHighlights: HighlightData[];
  pageCitation: CitationHighlight | null;
  pageTranslations: InlineTranslation[];
  onHighlightClick?: (highlightId: string) => void;
  onTextSelect?: (selection: SmartSelectionData | null) => void;
  onTranslationToggle?: (translationId: string) => void;
}

// Local type to avoid conflict with global PDFPageProxy
interface PDFPageProxyLocal {
  getViewport: (options: { scale: number }) => PDFViewportLocal;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewportLocal;
  }) => { promise: Promise<void>; cancel: () => void };
}

interface PDFViewportLocal {
  width: number;
  height: number;
  scale: number;
}

function CanvasPage({
  pdfPage,
  pageData,
  scale,
  pageNumber,
  pageHighlights,
  pageCitation,
  pageTranslations,
  onHighlightClick,
  onTextSelect,
  onTranslationToggle,
}: CanvasPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(
    null,
  );

  // Handle canvas render callback
  const handleCanvasRender = useCallback(
    (dims: { width: number; height: number }) => {
      setDimensions(dims);
    },
    [],
  );

  // Handle text selection from PDFTextLayer
  const handleTextSelect = useCallback(
    (
      selection: {
        pageNumber: number;
        startOffset: number;
        endOffset: number;
        selectedText: string;
        position: { x: number; y: number };
        rects: HighlightRect[];
      } | null,
    ) => {
      if (!selection) {
        onTextSelect?.(null);
        return;
      }
      onTextSelect?.(selection);
    },
    [onTextSelect],
  );

  return (
    <div
      ref={containerRef}
      className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      style={{
        width: dimensions.width || "auto",
        height: dimensions.height || "auto",
        maxWidth: "95vw",
      }}
      data-page-number={pageNumber}
      data-render-mode="canvas"
    >
      {/* Canvas Layer - Visual source */}
      <CanvasLayer
        page={pdfPage}
        scale={scale}
        pageNumber={pageNumber}
        onRender={handleCanvasRender}
      />

      {/* Text Layer - Selectable text */}
      {dimensions.width > 0 && (
        <PDFTextLayer
          textItems={pageData.textItems}
          width={dimensions.width}
          height={dimensions.height}
          pageNumber={pageNumber}
          onTextSelect={handleTextSelect}
        />
      )}

      {/* Highlight Layer */}
      <HighlightLayer
        highlights={pageHighlights}
        onHighlightClick={onHighlightClick}
        onHighlightHover={setHoveredHighlightId}
        hoveredHighlightId={hoveredHighlightId}
      />

      {/* Translation Layer */}
      <TranslationLayer
        translations={pageTranslations}
        scale={scale}
        onToggle={onTranslationToggle}
      />

      {/* Citation Layer */}
      <CitationLayer citation={pageCitation} />

      {/* Page number */}
      <div
        className="absolute bottom-0 left-0 right-0 text-center pb-4 text-slate-400 text-xs"
        style={{ fontSize: `${10 * scale}px` }}
      >
        {pageNumber}
      </div>
    </div>
  );
}

export default SmartPDFViewer;
