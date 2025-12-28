import type { TextItem } from "./pdf";

/**
 * Paper status in the processing pipeline
 */
export type PaperStatus = "processing" | "ready" | "error" | "ocr_needed";

/**
 * Reading status for library organization
 */
export type ReadingStatus = "want" | "reading" | "completed" | "archived";

/**
 * Paper record from the database
 */
export interface Paper {
  id: string;
  title: string;
  authors: string[] | null;
  abstract: string | null;
  arxiv_id: string | null;
  doi: string | null;
  source_url: string | null;
  storage_path: string;
  file_hash: string | null;
  page_count: number;
  status: PaperStatus;
  processing_error: string | null;
  reading_status: ReadingStatus;
  folder_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Paper page record from the database
 */
export interface PaperPage {
  id: string;
  paper_id: string;
  page_number: number;
  text_content: string;
  text_items: TextItem[];
  width: number | null;
  height: number | null;
  has_text: boolean;
  ocr_processed: boolean;
  created_at: string;
}

/**
 * Paper with its pages (joined query result)
 */
export interface PaperWithPages extends Paper {
  paper_pages: PaperPage[];
}

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: import("./citation").Citation[];
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

/**
 * Conversation record
 */
export interface Conversation {
  id: string;
  paper_id: string;
  title: string | null;
  highlight_id: string | null;
  page_context: number[] | null;
  created_at: string;
  updated_at: string;
}
