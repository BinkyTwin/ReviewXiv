/**
 * Mistral OCR Types
 *
 * Type definitions for Mistral AI OCR API responses
 */

/**
 * Image extracted from a page with bounding box coordinates
 */
export interface MistralImage {
  id: string;
  top_left_x: number;
  top_left_y: number;
  bottom_right_x: number;
  bottom_right_y: number;
  image_base64?: string;
}

/**
 * Page dimensions from Mistral OCR
 */
export interface PageDimensions {
  dpi: number;
  height: number;
  width: number;
}

/**
 * Single page result from Mistral OCR
 */
export interface MistralPage {
  index: number;
  markdown?: string;
  html?: string;
  images: MistralImage[];
  dimensions: PageDimensions;
  tables?: unknown[];
  hyperlinks?: unknown[];
}

/**
 * Usage information from Mistral OCR
 */
export interface MistralUsageInfo {
  pages_processed: number;
}

/**
 * Complete response from Mistral OCR API
 */
export interface MistralOCRResponse {
  pages: MistralPage[];
  model: string;
  usage_info: MistralUsageInfo;
}

/**
 * Document source for Mistral OCR request
 */
export type DocumentSource =
  | { type: "document_url"; document_url: string }
  | { type: "image_url"; image_url: string }
  | { type: "file_id"; file_id: string };

/**
 * Request body for Mistral OCR API
 */
export interface MistralOCRRequest {
  model: string;
  document: DocumentSource;
  pages?: string;
  include_image_base64?: boolean;
  table_format?: "markdown" | "html";
  output_format?: "markdown" | "html";
  image_min_size?: number;
}
