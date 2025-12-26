/**
 * Docling Parser
 *
 * Converts DoclingDocument to TextBlock[] for SmartPDFViewer
 */

import type {
  DoclingDocument,
  TextItem,
  TableItem,
  BoundingBox,
} from "./types";
import type { TextBlock, PageLayout } from "../ocr/types";

/** Counter for generating unique block IDs */
let blockIdCounter = 0;

function generateBlockId(): string {
  return `docling-block-${++blockIdCounter}`;
}

/** Reset block ID counter (for testing) */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0;
}

/**
 * Convert Docling BoundingBox to normalized position (0-1)
 */
function bboxToPosition(
  bbox: BoundingBox,
  pageWidth: number,
  pageHeight: number,
): TextBlock["position"] {
  // Docling uses BOTTOMLEFT origin by default, convert to TOPLEFT
  const isBottomLeft = bbox.coord_origin === "BOTTOMLEFT" || !bbox.coord_origin;

  if (isBottomLeft) {
    return {
      x: bbox.l / pageWidth,
      y: 1 - bbox.t / pageHeight, // Flip Y axis
      width: (bbox.r - bbox.l) / pageWidth,
      height: (bbox.t - bbox.b) / pageHeight,
    };
  }

  // Already TOPLEFT
  return {
    x: bbox.l / pageWidth,
    y: bbox.t / pageHeight,
    width: (bbox.r - bbox.l) / pageWidth,
    height: (bbox.b - bbox.t) / pageHeight,
  };
}

/**
 * Map Docling label to TextBlock type
 */
function labelToBlockType(label: string): TextBlock["type"] {
  const mapping: Record<string, TextBlock["type"]> = {
    paragraph: "paragraph",
    text: "paragraph",
    title: "heading",
    section_header: "heading",
    caption: "caption",
    footnote: "footnote",
    list_item: "list-item",
    table: "table",
    formula: "equation",
    code: "paragraph",
    page_header: "paragraph",
    page_footer: "footnote",
  };
  return mapping[label] || "paragraph";
}

/**
 * Get heading level from Docling item
 */
function getHeadingLevel(item: TextItem): number | undefined {
  if (item.label === "title") return 1;
  if (item.label === "section_header") {
    // Try to determine level from context or default to 2
    return 2;
  }
  return undefined;
}

/**
 * Convert a single Docling text item to TextBlock
 */
function textItemToBlock(
  item: TextItem,
  pageWidth: number,
  pageHeight: number,
): TextBlock | null {
  if (!item.prov || item.prov.length === 0) {
    return null;
  }

  const prov = item.prov[0];
  const position = bboxToPosition(prov.bbox, pageWidth, pageHeight);

  return {
    id: generateBlockId(),
    type: labelToBlockType(item.label),
    level: getHeadingLevel(item),
    content: item.text,
    position,
    isTranslated: false,
  };
}

/**
 * Convert Docling table to TextBlock
 */
function tableItemToBlock(
  item: TableItem,
  pageWidth: number,
  pageHeight: number,
): TextBlock | null {
  if (!item.prov || item.prov.length === 0) {
    return null;
  }

  const prov = item.prov[0];
  const position = bboxToPosition(prov.bbox, pageWidth, pageHeight);

  // Convert table cells to markdown format
  const { table_cells, num_rows, num_cols } = item.data;
  const grid: string[][] = Array(num_rows)
    .fill(null)
    .map(() => Array(num_cols).fill(""));

  for (const cell of table_cells) {
    const row = cell.start_row_offset_idx;
    const col = cell.start_col_offset_idx;
    if (row < num_rows && col < num_cols) {
      grid[row][col] = cell.text;
    }
  }

  const markdownLines: string[] = [];
  for (let i = 0; i < num_rows; i++) {
    markdownLines.push(`| ${grid[i].join(" | ")} |`);
    if (i === 0) {
      markdownLines.push(`|${Array(num_cols).fill("---").join("|")}|`);
    }
  }

  return {
    id: generateBlockId(),
    type: "table",
    content: markdownLines.join("\n"),
    position,
    isTranslated: false,
  };
}

/**
 * Parse DoclingDocument into PageLayout objects
 */
export function parseDoclingDocument(
  doc: DoclingDocument,
): Map<number, PageLayout> {
  const layouts = new Map<number, PageLayout>();

  // Get page dimensions
  const pageInfos = new Map<number, { width: number; height: number }>();
  for (const [pageKey, page] of Object.entries(doc.pages)) {
    const pageNo = parseInt(pageKey, 10) || page.page_no;
    pageInfos.set(pageNo, {
      width: page.size.width,
      height: page.size.height,
    });
  }

  // Group items by page
  const blocksByPage = new Map<number, TextBlock[]>();

  // Process text items
  if (doc.texts) {
    for (const item of doc.texts) {
      if (!item.prov || item.prov.length === 0) continue;

      for (const prov of item.prov) {
        const pageNo = prov.page_no;
        const pageInfo = pageInfos.get(pageNo);
        if (!pageInfo) continue;

        const block = textItemToBlock(
          { ...item, prov: [prov] },
          pageInfo.width,
          pageInfo.height,
        );
        if (block) {
          if (!blocksByPage.has(pageNo)) {
            blocksByPage.set(pageNo, []);
          }
          blocksByPage.get(pageNo)!.push(block);
        }
      }
    }
  }

  // Process tables
  if (doc.tables) {
    for (const item of doc.tables) {
      if (!item.prov || item.prov.length === 0) continue;

      const prov = item.prov[0];
      const pageNo = prov.page_no;
      const pageInfo = pageInfos.get(pageNo);
      if (!pageInfo) continue;

      const block = tableItemToBlock(item, pageInfo.width, pageInfo.height);
      if (block) {
        if (!blocksByPage.has(pageNo)) {
          blocksByPage.set(pageNo, []);
        }
        blocksByPage.get(pageNo)!.push(block);
      }
    }
  }

  // Create PageLayout for each page
  pageInfos.forEach((pageInfo, pageNo) => {
    const blocks = blocksByPage.get(pageNo) || [];

    // Sort blocks by vertical position (reading order)
    blocks.sort((a, b) => a.position.y - b.position.y);

    // Detect columns (simple heuristic)
    const columns = detectColumns(blocks);

    layouts.set(pageNo, {
      pageNumber: pageNo,
      width: pageInfo.width,
      height: pageInfo.height,
      columns,
      blocks,
      rawMarkdown: blocks.map((b) => b.content).join("\n\n"),
    });
  });

  return layouts;
}

/**
 * Detect number of columns in a page
 */
function detectColumns(blocks: TextBlock[]): number {
  if (blocks.length < 4) return 1;

  // Check if blocks are distributed in multiple columns
  const xPositions = blocks.map((b) => b.position.x);
  const leftBlocks = xPositions.filter((x) => x < 0.4).length;
  const rightBlocks = xPositions.filter((x) => x > 0.5).length;

  if (leftBlocks > 2 && rightBlocks > 2) {
    return 2;
  }

  return 1;
}

/**
 * Get all blocks for a specific page
 */
export function getPageBlocks(
  doc: DoclingDocument,
  pageNumber: number,
): TextBlock[] {
  const layouts = parseDoclingDocument(doc);
  return layouts.get(pageNumber)?.blocks || [];
}

/**
 * Export DoclingDocument to plain text
 */
export function doclingToPlainText(doc: DoclingDocument): string {
  if (!doc.texts) return "";

  return doc.texts.map((item) => item.text).join("\n\n");
}

/**
 * Find blocks containing specific text
 */
export function findBlocksWithText(
  layouts: Map<number, PageLayout>,
  searchText: string,
): Array<{ pageNumber: number; block: TextBlock }> {
  const results: Array<{ pageNumber: number; block: TextBlock }> = [];
  const searchLower = searchText.toLowerCase();

  layouts.forEach((layout, pageNumber) => {
    for (const block of layout.blocks) {
      if (block.content.toLowerCase().includes(searchLower)) {
        results.push({ pageNumber, block });
      }
    }
  });

  return results;
}
