/**
 * Docling Types
 *
 * TypeScript types for DoclingDocument structure
 * Based on docling-serve API response
 */

/** Bounding box coordinates (normalized 0-1) */
export interface BoundingBox {
  /** Left edge (0-1) */
  l: number;
  /** Top edge (0-1) */
  t: number;
  /** Right edge (0-1) */
  r: number;
  /** Bottom edge (0-1) */
  b: number;
  /** Coordinate origin */
  coord_origin?: "TOPLEFT" | "BOTTOMLEFT";
}

/** Provenance information for a document element */
export interface ProvenanceItem {
  page_no: number;
  bbox: BoundingBox;
  charspan: [number, number];
}

/** Base document item */
export interface DocItem {
  self_ref: string;
  parent?: { $ref: string };
  children?: { $ref: string }[];
  label: string;
  prov: ProvenanceItem[];
}

/** Text element */
export interface TextItem extends DocItem {
  label:
    | "paragraph"
    | "text"
    | "title"
    | "section_header"
    | "caption"
    | "footnote"
    | "page_header"
    | "page_footer";
  text: string;
  orig?: string;
}

/** Heading/Title element */
export interface HeadingItem extends DocItem {
  label: "title" | "section_header";
  text: string;
  level?: number;
}

/** List item */
export interface ListItem extends DocItem {
  label: "list_item";
  text: string;
  marker?: string;
  enumerated?: boolean;
}

/** Table cell */
export interface TableCell {
  text: string;
  row_span: number;
  col_span: number;
  start_row_offset_idx: number;
  end_row_offset_idx: number;
  start_col_offset_idx: number;
  end_col_offset_idx: number;
}

/** Table element */
export interface TableItem extends DocItem {
  label: "table";
  data: {
    table_cells: TableCell[];
    num_rows: number;
    num_cols: number;
  };
}

/** Formula/equation element */
export interface FormulaItem extends DocItem {
  label: "formula";
  text: string;
  orig?: string;
}

/** Picture/figure element */
export interface PictureItem extends DocItem {
  label: "picture" | "figure";
  caption?: string;
}

/** Code block element */
export interface CodeItem extends DocItem {
  label: "code";
  text: string;
  language?: string;
}

/** Page dimensions */
export interface PageDimensions {
  width: number;
  height: number;
}

/** Document page */
export interface DocPage {
  page_no: number;
  size: PageDimensions;
  image?: {
    uri: string;
    mimetype: string;
  };
}

/** Union of all document items */
export type DocumentItem =
  | TextItem
  | HeadingItem
  | ListItem
  | TableItem
  | FormulaItem
  | PictureItem
  | CodeItem;

/** Main Docling document structure */
export interface DoclingDocument {
  schema_name: "DoclingDocument";
  version: string;
  name: string;
  origin: {
    mimetype: string;
    binary_hash: string;
    filename: string;
    uri?: string;
  };
  furniture: {
    self_ref: string;
    children: { $ref: string }[];
    content_layer: string;
    name: string;
    label: string;
  };
  body: {
    self_ref: string;
    children: { $ref: string }[];
    content_layer: string;
    name: string;
    label: string;
  };
  groups: DocItem[];
  texts: TextItem[];
  pictures: PictureItem[];
  tables: TableItem[];
  key_value_items: DocItem[];
  form_items: DocItem[];
  pages: Record<string, DocPage>;
}

/** API response from docling-serve */
export interface DoclingConvertResponse {
  document: DoclingDocument;
  markdown?: string;
  status: "success" | "error";
  error?: string;
}

/** Conversion options */
export interface DoclingConvertOptions {
  /** Output format */
  format?: "json" | "markdown" | "html";
  /** Enable OCR for scanned documents */
  ocr?: boolean;
  /** Extract tables */
  tables?: boolean;
  /** Extract images */
  images?: boolean;
}
