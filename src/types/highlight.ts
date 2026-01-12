export type HighlightColor = "yellow" | "green" | "blue" | "red" | "purple";

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseHighlight {
  id: string;
  paperId: string;
  format: "pdf" | "html";
  startOffset: number;
  endOffset: number;
  selectedText: string;
  color: HighlightColor;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PdfHighlight extends BaseHighlight {
  format: "pdf";
  pageNumber: number;
  rects: HighlightRect[];
  sectionId?: null;
}

export interface HtmlHighlight extends BaseHighlight {
  format: "html";
  sectionId: string;
  pageNumber?: number;
  rects: HighlightRect[];
}

export type Highlight = PdfHighlight | HtmlHighlight;

interface BaseCreateHighlightRequest {
  paperId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  color: HighlightColor;
}

export interface CreatePdfHighlightRequest extends BaseCreateHighlightRequest {
  format?: "pdf";
  pageNumber: number;
  rects: HighlightRect[];
}

export interface CreateHtmlHighlightRequest extends BaseCreateHighlightRequest {
  format: "html";
  sectionId: string;
  pageNumber?: number;
  rects?: HighlightRect[];
}

export type CreateHighlightRequest =
  | CreatePdfHighlightRequest
  | CreateHtmlHighlightRequest;
