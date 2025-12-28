export type HighlightColor = "yellow" | "green" | "blue" | "red" | "purple";

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  paperId: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  rects: HighlightRect[];
  color: HighlightColor;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHighlightRequest {
  paperId: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  rects: HighlightRect[];
  color: HighlightColor;
}
