export interface Note {
  id: string;
  paperId: string;
  format: "pdf" | "html";
  highlightId?: string;
  title?: string;
  content: string;
  pageNumber?: number;
  sectionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  paperId: string;
  format?: "pdf" | "html";
  highlightId?: string;
  title?: string;
  content: string;
  pageNumber?: number;
  sectionId?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}
