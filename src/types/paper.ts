import type { TextItem } from "./pdf";

/**
 * Paper status in the processing pipeline
 */
export type PaperStatus = "processing" | "ready" | "error" | "ocr_needed";

/**
 * Paper format type
 */
export type PaperFormat = "pdf" | "html";

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
  format: PaperFormat;
  html_cached: boolean | null;
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
 * Paper section record for HTML
 */
export interface PaperSection {
  id: string;
  paper_id: string;
  section_index: number;
  section_id: string | null;
  title: string | null;
  level: number | null;
  text_content: string;
  html_content: string | null;
  parent_section_id: string | null;
  created_at: string;
}

/**
 * HTML cache record
 */
export interface PaperHtmlCache {
  id: string;
  paper_id: string;
  arxiv_id: string;
  raw_html: string;
  source_url: string | null;
  fetched_at: string;
  html_hash: string | null;
}

/**
 * Paper with its pages (joined query result)
 */
export interface PaperWithPages extends Paper {
  paper_pages: PaperPage[];
}

/**
 * Paper with its HTML sections
 */
export interface PaperWithSections extends Paper {
  paper_sections: PaperSection[];
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
