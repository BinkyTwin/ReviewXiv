import type {
  Highlight as ExtendedHighlight,
  ScaledPosition,
  Content,
} from "react-pdf-highlighter-extended";
import type {
  PdfHighlight,
  HighlightColor,
  HighlightRect,
} from "@/types/highlight";
import type {
  PdfInlineTranslation,
  TranslationLanguage,
  TranslationSelection,
} from "@/types/translation";
import type { PdfCitation } from "@/types/citation";
import type { TextItem } from "@/types/pdf";

/**
 * Map of page numbers to their text items (for citation -> rect conversion)
 */
export type TextItemsMap = Map<number, TextItem[]>;

/**
 * Extension of Highlight for ReviewXiv
 * Adds ReviewXiv-specific properties (color, offsets)
 */
export interface ReviewXivHighlight extends ExtendedHighlight {
  /** Highlight color */
  color: HighlightColor;
  /** Character offsets for citation compatibility */
  startOffset?: number;
  endOffset?: number;
  /** Optional note */
  note?: string;
  /** Paper ID */
  paperId: string;
  /** Timestamps */
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Data for creating a new highlight
 */
export interface NewHighlightData {
  position: ScaledPosition;
  content: Content;
  color: HighlightColor;
  paperId: string;
  note?: string;
}

/**
 * Props for the main PDF viewer component
 */
export interface PDFHighlighterViewerProps {
  /** PDF URL to display */
  pdfUrl: string;
  /** Paper ID for highlights */
  paperId: string;
  /** Highlights loaded from Supabase */
  highlights?: PdfHighlight[];
  /** Active citation to flash */
  activeCitation?: PdfCitation | null;
  /** Text items map for citation -> rect conversion */
  textItemsMap?: TextItemsMap;
  /** Callback when highlight is created */
  onHighlightCreate?: (highlight: PdfHighlight) => void;
  /** Callback when highlight is clicked */
  onHighlightClick?: (highlight: PdfHighlight) => void;
  /** Callback when highlight is deleted */
  onHighlightDelete?: (highlightId: string) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback for "Ask" action on text selection */
  onAskSelection?: (text: string, page: number) => void;
  /** Callback for "Translate" action on selection */
  onTranslateSelection?: (selection: TranslationSelection) => void;
  /** Callback for "Ask" action on image/area selection (base64 PNG) */
  onAskImage?: (imageData: string, page: number) => void;
  /** Callback when an area highlight (image) is saved */
  onAreaHighlightCreate?: (
    imageData: string,
    page: number,
    position: { x: number; y: number; width: number; height: number },
  ) => void;
  /** Ref to scroll to a highlight (exposed for external navigation) */
  scrollToHighlightRef?: React.MutableRefObject<
    ((highlightId: string) => void) | null
  >;
  /** Inline translations for overlay rendering */
  translations?: PdfInlineTranslation[];
  /** Callback to toggle translation visibility */
  onTranslationToggle?: (translationId: string, nextActive: boolean) => void;
  /** Active translation target language */
  translationLanguage?: TranslationLanguage;
  /** Available translation languages */
  translationLanguageOptions?: ReadonlyArray<{
    value: TranslationLanguage;
    label: string;
  }>;
  /** Callback when translation language changes */
  onTranslationLanguageChange?: (language: TranslationLanguage) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page dimensions for position conversion
 */
export interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Map of page numbers to their dimensions
 */
export type PageDimensionsMap = Map<number, PageDimensions>;

/**
 * Tip configuration for highlight creation
 */
export interface TipConfig {
  /** Selected color */
  selectedColor: HighlightColor;
  /** Optional note */
  note: string;
}

/**
 * Props for HighlightTip component
 */
export interface HighlightTipProps {
  /** Selected content */
  content: Content;
  /** Current page number */
  pageNumber: number;
  /** Callback to confirm highlight creation */
  onConfirm: (color: HighlightColor, note?: string) => void;
  /** Callback for Ask action */
  onAsk?: () => void;
  /** Callback for Translate action */
  onTranslate?: () => void;
  /** Callback to dismiss the tip */
  onDismiss: () => void;
}

/**
 * Props for HighlightPopup component (on hover)
 */
export interface HighlightPopupProps {
  /** The highlight being hovered */
  highlight: ReviewXivHighlight;
  /** Callback to edit the highlight */
  onEdit?: () => void;
  /** Callback to delete the highlight */
  onDelete?: () => void;
  /** Callback to add/edit note */
  onAddNote?: () => void;
}

/**
 * Props for CitationFlash component
 */
export interface CitationFlashProps {
  /** Citation to flash */
  citation: PdfCitation;
  /** Rects to highlight (converted from citation) */
  rects: HighlightRect[];
  /** Page number */
  pageNumber: number;
  /** Callback when flash animation completes */
  onComplete?: () => void;
}
