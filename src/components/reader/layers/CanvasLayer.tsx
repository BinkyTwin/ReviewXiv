"use client";

import { useEffect, useRef, useCallback, memo } from "react";

// Local types for PDF.js page rendering
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

export interface CanvasLayerProps {
  /** PDF.js page object */
  page: PDFPageProxy | null;
  /** Current scale factor */
  scale: number;
  /** Page number for data attribute */
  pageNumber: number;
  /** Callback when canvas is rendered with dimensions */
  onRender?: (dimensions: { width: number; height: number }) => void;
}

/**
 * CanvasLayer - Renders a PDF page using PDF.js canvas
 * This is the visual source of truth for the document
 */
export const CanvasLayer = memo(function CanvasLayer({
  page,
  scale,
  pageNumber,
  onRender,
}: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const renderPage = useCallback(async () => {
    if (!page || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Cancel any existing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      // Get viewport at desired scale
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

      // Render the page
      const renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
      });

      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // Notify parent of rendered dimensions
      onRender?.({
        width: viewport.width,
        height: viewport.height,
      });
    } catch (err) {
      // Ignore cancelled render errors
      if (err instanceof Error && err.message.includes("Rendering cancelled")) {
        return;
      }
      console.error(`Error rendering page ${pageNumber}:`, err);
    }
  }, [page, scale, pageNumber, onRender]);

  // Render when page or scale changes
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      data-page-number={pageNumber}
      style={{ display: "block" }}
    />
  );
});

export default CanvasLayer;
