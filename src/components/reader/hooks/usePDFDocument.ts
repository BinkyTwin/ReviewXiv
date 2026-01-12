"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PageData } from "@/types/pdf";

// Local types for PDF.js (subset of what we need)
interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  destroy: () => void;
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => { promise: Promise<void>; cancel: () => void };
}

interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}

const PDFJS_VERSION = "4.8.69";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

export interface UsePDFDocumentOptions {
  /** URL of the PDF to load */
  pdfUrl: string;
  /** Whether to fetch text items from the API */
  fetchTextItems?: boolean;
}

export interface UsePDFDocumentResult {
  /** PDF.js document proxy */
  pdfDocument: PDFDocumentProxy | null;
  /** Map of page number to PDF.js page proxy */
  pages: Map<number, PDFPageProxy>;
  /** Map of page number to page data with text items */
  pageDataMap: Map<number, PageData>;
  /** Total number of pages */
  numPages: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether PDF.js is loaded */
  pdfjsLoaded: boolean;
  /** Reload a specific page */
  reloadPage: (pageNumber: number) => Promise<void>;
}

/**
 * Hook to load a PDF document with PDF.js and optionally fetch text items
 */
export function usePDFDocument({
  pdfUrl,
  fetchTextItems = true,
}: UsePDFDocumentOptions): UsePDFDocumentResult {
  const [pdfjsLoaded, setPdfjsLoaded] = useState(() =>
    typeof window !== "undefined" ? !!window.pdfjsLib : false,
  );
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<Map<number, PDFPageProxy>>(new Map());
  const [pageDataMap, setPageDataMap] = useState<Map<number, PageData>>(
    new Map(),
  );
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documentRef = useRef<PDFDocumentProxy | null>(null);

  // Load PDF.js from CDN
  useEffect(() => {
    if (typeof window === "undefined" || window.pdfjsLib) return;

    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.mjs`;
    script.type = "module";
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
        setPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load PDF.js library");
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // Load PDF document once PDF.js is ready
  useEffect(() => {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLoaded || !pdfUrl || !pdfjsLib) return;

    let isCancelled = false;

    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load PDF with PDF.js
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;

        if (isCancelled) {
          doc.destroy();
          return;
        }

        documentRef.current = doc;
        setPdfDocument(doc);
        setNumPages(doc.numPages);

        // Load all pages
        const pagesMap = new Map<number, PDFPageProxy>();
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (isCancelled) break;
          pagesMap.set(i, page);
        }

        if (!isCancelled) {
          setPages(pagesMap);
        }

        // Fetch text items from API if requested
        if (fetchTextItems && !isCancelled) {
          try {
            const response = await fetch("/api/pdf-text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pdfUrl }),
            });

            if (response.ok) {
              const data = await response.json();
              const dataMap = new Map<number, PageData>();
              for (const pageData of data.pages) {
                dataMap.set(pageData.pageNumber, pageData);
              }
              if (!isCancelled) {
                setPageDataMap(dataMap);
              }
            }
          } catch (err) {
            console.warn("Failed to fetch text items:", err);
            // Continue without text items - will fall back to OCR
          }
        }

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading PDF:", err);
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (documentRef.current) {
        documentRef.current.destroy();
        documentRef.current = null;
      }
    };
  }, [pdfUrl, pdfjsLoaded, fetchTextItems]);

  // Reload a specific page
  const reloadPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocument || pageNumber < 1 || pageNumber > numPages) return;

      try {
        const page = await pdfDocument.getPage(pageNumber);
        setPages((prev) => new Map(prev).set(pageNumber, page));
      } catch (err) {
        console.error(`Error reloading page ${pageNumber}:`, err);
      }
    },
    [pdfDocument, numPages],
  );

  return {
    pdfDocument,
    pages,
    pageDataMap,
    numPages,
    isLoading,
    error,
    pdfjsLoaded,
    reloadPage,
  };
}

export default usePDFDocument;
