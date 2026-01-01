// Main component
export { PDFHighlighterViewer } from "./PDFHighlighterViewer";

// Sub-components
export { HighlightTip } from "./HighlightTip";
export { CitationFlash } from "./CitationFlash";
export { ZoomToolbar } from "./ZoomToolbar";
export { AreaSelectionTip } from "./AreaSelectionTip";

// Types
export type {
  ReviewXivHighlight,
  NewHighlightData,
  PDFHighlighterViewerProps,
  PageDimensions,
  PageDimensionsMap,
  TextItemsMap,
  TipConfig,
  HighlightTipProps,
  HighlightPopupProps,
  CitationFlashProps,
} from "./types";

// Utils
export {
  scaledPositionToRects,
  rectsToScaledPosition,
  mergeAdjacentRects,
  getPositionCenter,
} from "./utils/position-converter";

export {
  supabaseToRphHighlight,
  supabaseHighlightsToRph,
  rphToCreateHighlightRequest,
  findOriginalHighlight,
  generateHighlightId,
  highlightsOverlap,
} from "./utils/highlight-adapter";
