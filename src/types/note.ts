export interface Note {
  id: string;
  paperId: string;
  highlightId?: string;
  title?: string;
  content: string;
  pageNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  paperId: string;
  highlightId?: string;
  title?: string;
  content: string;
  pageNumber?: number;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}
