"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PDFToolbar } from "./PDFToolbar";
import { HighlightLayer } from "./HighlightLayer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Citation } from "@/types/citation";
import type { TextItem } from "@/types/pdf";
import type { PDFDocumentProxy, PDFViewport } from "@/types/pdfjs.d";

export interface SelectionData {
  page: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  position: { x: number; y: number };
}

interface PDFViewerProps {
  pdfUrl: string;
  textItems?: Map<number, TextItem[]>;
  activeCitation?: Citation | null;
  onPageChange?: (page: number) => void;
  onTextSelect?: (selection: SelectionData | null) => void;
}

export function PDFViewer({
  pdfUrl,
  textItems,
  activeCitation,
  onPageChange,
  onTextSelect,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderTasks = useRef<Map<number, { cancel(): void }>>(new Map());

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      // Set worker source
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
        setPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load PDF viewer");
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts before load
    };
  }, []);

  // Load PDF document once pdfjs is ready
  useEffect(() => {
    if (!pdfjsLoaded || !window.pdfjsLib) return;

    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) return;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) {
          pdfDoc.destroy();
          return;
        }

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF");
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, pdfjsLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdf) {
        pdf.destroy();
      }
      renderTasks.current.forEach((task) => task.cancel());
    };
  }, [pdf]);

  // Render text layer for a page
  const renderTextLayer = useCallback(
    (pageNumber: number, viewport: PDFViewport) => {
      const textLayerDiv = textLayerRefs.current.get(pageNumber);
      const pageTextItems = textItems?.get(pageNumber);

      if (!textLayerDiv || !pageTextItems) return;

      // Clear existing content
      textLayerDiv.innerHTML = "";

      // Set text layer dimensions
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      // Create spans for each text item
      for (const item of pageTextItems) {
        const span = document.createElement("span");
        span.textContent = item.str;
        span.dataset.startOffset = String(item.startOffset);
        span.dataset.endOffset = String(item.endOffset);

        // Position using normalized coordinates
        const left = item.x * viewport.width;
        const top = item.y * viewport.height;
        const width = item.width * viewport.width;
        const height = item.height * viewport.height;

        span.style.cssText = `
          position: absolute;
          left: ${left}px;
          top: ${top}px;
          width: ${width}px;
          height: ${height}px;
          font-size: ${height * 0.9}px;
          line-height: 1;
          white-space: pre;
          transform-origin: left top;
          color: transparent;
          pointer-events: auto;
        `;

        textLayerDiv.appendChild(span);
      }
    },
    [textItems],
  );

  // Render a page to canvas
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdf) return;

      const canvas = canvasRefs.current.get(pageNumber);
      const container = pageRefs.current.get(pageNumber);
      if (!canvas || !container) return;

      // Cancel existing render task
      const existingTask = renderTasks.current.get(pageNumber);
      if (existingTask) {
        existingTask.cancel();
      }

      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        // Use devicePixelRatio for crisp rendering on HiDPI/Retina displays
        const pixelRatio = window.devicePixelRatio || 1;
        const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

        // Set canvas internal resolution (higher for crisp text)
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Set CSS display size (actual visible size)
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;

        const context = canvas.getContext("2d");
        if (!context) return;

        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });

        renderTasks.current.set(pageNumber, renderTask);

        await renderTask.promise;

        // Render text layer after canvas
        renderTextLayer(pageNumber, viewport);
      } catch (err) {
        // Ignore cancelled render errors
        if (
          err instanceof Error &&
          err.message.includes("Rendering cancelled")
        ) {
          return;
        }
        console.error("Error rendering page:", err);
      }
    },
    [pdf, scale, renderTextLayer],
  );

  // Render all pages when PDF or scale changes
  useEffect(() => {
    if (!pdf) return;

    for (let i = 1; i <= numPages; i++) {
      renderPage(i);
    }
  }, [pdf, scale, numPages, renderPage]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !onTextSelect) {
      onTextSelect?.(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onTextSelect(null);
      return;
    }

    // Find which page the selection is in
    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      onTextSelect(null);
      return;
    }

    // Find the text layer parent and page number
    let textLayerDiv: HTMLElement | null = null;
    let pageNumber = 0;

    let node: Node | null = anchorNode;
    while (node) {
      if (node instanceof HTMLElement) {
        if (node.classList.contains("text-layer")) {
          textLayerDiv = node;
          const pageContainer = node.closest("[data-page-number]");
          if (pageContainer instanceof HTMLElement) {
            pageNumber = parseInt(pageContainer.dataset.pageNumber || "0", 10);
          }
          break;
        }
      }
      node = node.parentNode;
    }

    if (!textLayerDiv || pageNumber === 0) {
      onTextSelect(null);
      return;
    }

    // Get offsets from selected spans
    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    let startOffset = 0;
    let endOffset = 0;

    // Find start offset
    const startSpan =
      startContainer instanceof HTMLElement
        ? startContainer
        : startContainer.parentElement;
    if (startSpan?.dataset.startOffset) {
      startOffset =
        parseInt(startSpan.dataset.startOffset, 10) + range.startOffset;
    }

    // Find end offset
    const endSpan =
      endContainer instanceof HTMLElement
        ? endContainer
        : endContainer.parentElement;
    if (endSpan?.dataset.endOffset) {
      endOffset =
        parseInt(endSpan.dataset.startOffset || "0", 10) + range.endOffset;
    }

    // Get selection position for popover
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    };

    onTextSelect({
      page: pageNumber,
      startOffset,
      endOffset,
      selectedText,
      position,
    });
  }, [onTextSelect]);

  // Handle page ref callback
  const handlePageRef = useCallback(
    (pageNumber: number) => (element: HTMLDivElement | null) => {
      if (element) {
        pageRefs.current.set(pageNumber, element);
      }
    },
    [],
  );

  // Handle canvas ref callback
  const handleCanvasRef = useCallback(
    (pageNumber: number) => (element: HTMLCanvasElement | null) => {
      if (element) {
        canvasRefs.current.set(pageNumber, element);
      }
    },
    [],
  );

  // Handle text layer ref callback
  const handleTextLayerRef = useCallback(
    (pageNumber: number) => (element: HTMLDivElement | null) => {
      if (element) {
        textLayerRefs.current.set(pageNumber, element);
      }
    },
    [],
  );

  // Scroll to page
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageElement = pageRefs.current.get(pageNumber);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Handle page change from toolbar
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      scrollToPage(page);
    },
    [scrollToPage],
  );

  // Scroll to active citation
  useEffect(() => {
    if (activeCitation) {
      scrollToPage(activeCitation.page);
    }
  }, [activeCitation, scrollToPage]);

  // Track current page on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;

    let closestPage = 1;
    let closestDistance = Infinity;

    pageRefs.current.forEach((element, pageNumber) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNumber;
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
      onPageChange?.(closestPage);
    }
  }, [currentPage, onPageChange]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <PDFToolbar
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        onScaleChange={setScale}
        onPageChange={handlePageChange}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-auto p-4"
      >
        <div className="flex flex-col items-center">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[800px] w-[600px]" />
              <Skeleton className="h-[800px] w-[600px]" />
            </div>
          ) : (
            Array.from({ length: numPages }, (_, index) => (
              <div
                key={`page_${index + 1}`}
                ref={handlePageRef(index + 1)}
                className="relative bg-white shadow-lg mb-4"
                data-page-number={index + 1}
              >
                <canvas ref={handleCanvasRef(index + 1)} className="block" />
                <div
                  ref={handleTextLayerRef(index + 1)}
                  className="text-layer absolute inset-0 overflow-hidden select-text"
                  style={{ userSelect: "text" }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {activeCitation && textItems && (
        <HighlightLayer
          citation={activeCitation}
          textItems={textItems}
          pageRefs={pageRefs.current}
          scale={scale}
        />
      )}
    </div>
  );
}
