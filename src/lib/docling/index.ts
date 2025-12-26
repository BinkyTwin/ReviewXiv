/**
 * Docling Module
 *
 * Document processing using Docling for precise text extraction with coordinates
 */

// Types
export type {
  BoundingBox,
  DoclingDocument,
  DoclingConvertResponse,
  DoclingConvertOptions,
  TextItem,
  TableItem,
  HeadingItem,
  ListItem,
  FormulaItem,
  PictureItem,
  CodeItem,
  DocPage,
  ProvenanceItem,
} from "./types";

// Client
export {
  checkDoclingAvailable,
  getDoclingInfo,
  convertPDF,
  convertPDFFromURL,
  convertPDFToMarkdown,
  createDoclingClient,
  type DoclingClient,
} from "./client";

// Parser
export {
  parseDoclingDocument,
  getPageBlocks,
  doclingToPlainText,
  findBlocksWithText,
  resetBlockIdCounter,
} from "./parser";
