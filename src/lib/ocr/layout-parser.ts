/**
 * Layout Parser
 *
 * Parses markdown from OCR output into positioned TextBlocks
 * Handles document structure detection (headings, paragraphs, lists, tables)
 * and estimates positions for CSS layout
 */

import { TextBlock, PageLayout } from "./types";

/** Unique ID generator */
let blockIdCounter = 0;
function generateBlockId(): string {
  return `block-${++blockIdCounter}`;
}

/** Reset ID counter (for testing) */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0;
}

/**
 * Parse markdown into TextBlocks
 *
 * This is a heuristic-based parser that:
 * 1. Splits content into logical blocks (headings, paragraphs, lists, tables)
 * 2. Estimates vertical positions based on content order
 * 3. Detects multi-column layouts from spacing patterns
 */
export function parseMarkdownToBlocks(markdown: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const lines = markdown.split("\n");

  let currentY = 0.02; // Start 2% from top
  const currentColumn = 0;
  let inList = false;
  let inTable = false;
  let tableBuffer: string[] = [];
  let listBuffer: string[] = [];

  // Estimate line height based on typical academic paper
  const estimatedLineHeight = 0.025; // 2.5% of page height per line
  const paragraphGap = 0.015; // Gap between paragraphs
  const headingGap = 0.02; // Gap before headings

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (inList && listBuffer.length > 0) {
        // End of list
        blocks.push(createListBlock(listBuffer, currentY, currentColumn));
        currentY += listBuffer.length * estimatedLineHeight + paragraphGap;
        listBuffer = [];
        inList = false;
      }
      if (inTable && tableBuffer.length > 0) {
        // End of table
        blocks.push(createTableBlock(tableBuffer, currentY, currentColumn));
        currentY += tableBuffer.length * estimatedLineHeight + paragraphGap;
        tableBuffer = [];
        inTable = false;
      }
      currentY += paragraphGap / 2;
      continue;
    }

    // Detect headings (# ## ### etc)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      currentY += headingGap;
      const level = headingMatch[1].length;
      const content = headingMatch[2];

      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level,
        content,
        position: {
          x: 0.05,
          y: currentY,
          width: 0.9,
          height: estimatedLineHeight * (1.5 - level * 0.1), // Larger headings
        },
        column: currentColumn,
        isTranslated: false,
      });

      currentY += estimatedLineHeight * (1.8 - level * 0.1) + paragraphGap;
      continue;
    }

    // Detect list items (- or * or numbered)
    const listMatch =
      trimmedLine.match(/^[-*]\s+(.+)$/) || trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      inList = true;
      listBuffer.push(listMatch[1]);
      continue;
    }

    // Detect table rows (| col | col |)
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      // Skip separator rows (|---|---|)
      if (!trimmedLine.match(/^\|[\s-|]+\|$/)) {
        inTable = true;
        tableBuffer.push(trimmedLine);
      }
      continue;
    }

    // Detect equations ($$...$$)
    if (trimmedLine.startsWith("$$") || trimmedLine.startsWith("\\[")) {
      blocks.push({
        id: generateBlockId(),
        type: "equation",
        content: trimmedLine
          .replace(/^\$\$|\$\$$/g, "")
          .replace(/^\\\[|\\\]$/g, ""),
        position: {
          x: 0.1,
          y: currentY,
          width: 0.8,
          height: estimatedLineHeight * 1.5,
        },
        column: currentColumn,
        isTranslated: false,
      });
      currentY += estimatedLineHeight * 2;
      continue;
    }

    // Detect captions (Figure X: or Table X:)
    const captionMatch = trimmedLine.match(/^(Figure|Table|Fig\.)\s*\d*[.:]/i);
    if (captionMatch) {
      blocks.push({
        id: generateBlockId(),
        type: "caption",
        content: trimmedLine,
        position: {
          x: 0.1,
          y: currentY,
          width: 0.8,
          height: estimatedLineHeight,
        },
        column: currentColumn,
        isTranslated: false,
      });
      currentY += estimatedLineHeight + paragraphGap;
      continue;
    }

    // Default: paragraph
    // Flush any pending lists/tables first
    if (inList && listBuffer.length > 0) {
      blocks.push(createListBlock(listBuffer, currentY, currentColumn));
      currentY += listBuffer.length * estimatedLineHeight + paragraphGap;
      listBuffer = [];
      inList = false;
    }
    if (inTable && tableBuffer.length > 0) {
      blocks.push(createTableBlock(tableBuffer, currentY, currentColumn));
      currentY += tableBuffer.length * estimatedLineHeight + paragraphGap;
      tableBuffer = [];
      inTable = false;
    }

    // Estimate paragraph height based on content length
    const estimatedLines = Math.ceil(trimmedLine.length / 80); // ~80 chars per line
    const paragraphHeight = estimatedLines * estimatedLineHeight;

    blocks.push({
      id: generateBlockId(),
      type: "paragraph",
      content: trimmedLine,
      position: {
        x: 0.05,
        y: currentY,
        width: 0.9,
        height: paragraphHeight,
      },
      column: currentColumn,
      isTranslated: false,
    });

    currentY += paragraphHeight + paragraphGap;
  }

  // Flush remaining buffers
  if (listBuffer.length > 0) {
    blocks.push(createListBlock(listBuffer, currentY, currentColumn));
  }
  if (tableBuffer.length > 0) {
    blocks.push(createTableBlock(tableBuffer, currentY, currentColumn));
  }

  return blocks;
}

/**
 * Create a list block from accumulated list items
 */
function createListBlock(
  items: string[],
  startY: number,
  column: number,
): TextBlock {
  return {
    id: generateBlockId(),
    type: "list",
    content: items.map((item, i) => `${i + 1}. ${item}`).join("\n"),
    position: {
      x: 0.08,
      y: startY,
      width: 0.84,
      height: items.length * 0.025,
    },
    column,
    isTranslated: false,
  };
}

/**
 * Create a table block from accumulated rows
 */
function createTableBlock(
  rows: string[],
  startY: number,
  column: number,
): TextBlock {
  return {
    id: generateBlockId(),
    type: "table",
    content: rows.join("\n"),
    position: {
      x: 0.05,
      y: startY,
      width: 0.9,
      height: rows.length * 0.03,
    },
    column,
    isTranslated: false,
  };
}

/**
 * Detect if the page has multiple columns
 * Returns the number of detected columns
 */
export function detectColumns(blocks: TextBlock[]): number {
  // Simple heuristic: if we have blocks with x > 0.5, likely 2 columns
  const rightBlocks = blocks.filter((b) => b.position.x > 0.45);
  const leftBlocks = blocks.filter((b) => b.position.x < 0.45);

  if (rightBlocks.length > 2 && leftBlocks.length > 2) {
    return 2;
  }

  return 1;
}

/**
 * Apply column layout to blocks
 * Redistributes blocks into columns based on position
 */
export function applyColumnLayout(
  blocks: TextBlock[],
  numColumns: number,
): TextBlock[] {
  if (numColumns === 1) return blocks;

  const columnWidth = 0.9 / numColumns;
  const columnGap = 0.02;

  return blocks.map((block) => {
    // Determine which column based on current x position
    const columnIndex = block.position.x > 0.5 ? 1 : 0;

    return {
      ...block,
      column: columnIndex,
      position: {
        ...block.position,
        x: 0.05 + columnIndex * (columnWidth + columnGap),
        width: columnWidth - columnGap,
      },
    };
  });
}

/**
 * Convert markdown OCR output to a full PageLayout
 */
export function parseOCRToPageLayout(
  markdown: string,
  pageNumber: number,
  pageWidth: number = 612, // PDF default width
  pageHeight: number = 792, // PDF default height
): PageLayout {
  let blocks = parseMarkdownToBlocks(markdown);
  const numColumns = detectColumns(blocks);

  if (numColumns > 1) {
    blocks = applyColumnLayout(blocks, numColumns);
  }

  return {
    pageNumber,
    width: pageWidth,
    height: pageHeight,
    columns: numColumns,
    blocks,
    rawMarkdown: markdown,
  };
}

/**
 * Merge adjacent blocks of the same type
 * Useful for cleaning up fragmented OCR output
 */
export function mergeAdjacentBlocks(blocks: TextBlock[]): TextBlock[] {
  if (blocks.length < 2) return blocks;

  const merged: TextBlock[] = [];
  let current = { ...blocks[0] };

  for (let i = 1; i < blocks.length; i++) {
    const next = blocks[i];

    // Merge if same type and close vertically
    const verticalGap =
      next.position.y - (current.position.y + current.position.height);
    const sameType = current.type === next.type;
    const closeEnough = verticalGap < 0.02;

    if (sameType && closeEnough && current.type === "paragraph") {
      // Merge paragraphs
      current.content += " " + next.content;
      current.position.height =
        next.position.y + next.position.height - current.position.y;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Extract plain text from all blocks
 * Useful for search and citation matching
 */
export function extractPlainText(blocks: TextBlock[]): string {
  return blocks.map((b) => b.content).join("\n\n");
}

/**
 * Find block containing a specific text offset
 */
export function findBlockAtOffset(
  blocks: TextBlock[],
  offset: number,
): { block: TextBlock; localOffset: number } | null {
  let currentOffset = 0;

  for (const block of blocks) {
    const blockLength = block.content.length;

    if (offset >= currentOffset && offset < currentOffset + blockLength) {
      return {
        block,
        localOffset: offset - currentOffset,
      };
    }

    currentOffset += blockLength + 2; // +2 for \n\n between blocks
  }

  return null;
}
