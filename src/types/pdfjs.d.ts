/**
 * PDF.js global type declarations
 *
 * Used when loading PDF.js from CDN
 */

export interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  destroy: () => void;
}

export interface PDFRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => PDFRenderTask;
  getTextContent: () => Promise<{
    items: Array<{
      str: string;
      transform: number[];
    }>;
  }>;
}

export interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}

export interface PDFJSLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | { url: string }) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

declare global {
  interface Window {
    pdfjsLib?: PDFJSLib;
  }
}
