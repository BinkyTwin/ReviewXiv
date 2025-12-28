import type { Highlight, HighlightRect } from "@/types/highlight";
import type { Citation } from "@/types/citation";
import type { PageData } from "@/types/pdf";
import type {
  HighlightData as LayerHighlightData,
  CitationHighlight as LayerCitationHighlight,
  InlineTranslation as LayerInlineTranslation,
} from "@/components/reader/layers";

export interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}

export interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => { promise: Promise<void>; cancel: () => void };
}

export interface SmartSelectionData {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  position: { x: number; y: number };
  rects: HighlightRect[];
}

export interface PDFViewerProps {
  pdfUrl: string;
  initialScale?: number;
  className?: string;
  highlights?: Highlight[];
  activeCitation?: Citation | null;
  inlineTranslations?: LayerInlineTranslation[];
  onHighlightClick?: (highlight: Highlight) => void;
  onTextSelect?: (selection: SmartSelectionData | null) => void;
  onPageChange?: (pageNumber: number) => void;
  onTranslationToggle?: (translationId: string) => void;
}

export type HighlightData = LayerHighlightData;
export type CitationHighlight = LayerCitationHighlight;
export type InlineTranslation = LayerInlineTranslation;
export type { PageData };
