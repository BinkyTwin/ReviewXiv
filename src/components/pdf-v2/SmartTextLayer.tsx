"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PageLayout, TextSelection } from "@/lib/ocr/types";
import TextBlock from "./TextBlock";

interface SmartTextLayerProps {
  /** Page layout with all text blocks */
  layout: PageLayout;
  /** Scale factor for display */
  scale: number;
  /** Page dimensions in pixels at scale 1 */
  baseWidth: number;
  baseHeight: number;
  /** Highlights to display */
  highlights?: Map<string, { start: number; end: number; color: string }[]>;
  /** Called when selection changes */
  onSelectionChange?: (selection: TextSelection | null) => void;
  /** Called when translation is toggled */
  onTranslationToggle?: (blockId: string, showTranslation: boolean) => void;
  /** Show column grid for debugging */
  showColumnGrid?: boolean;
  /** CSS classes for the container */
  className?: string;
}

/**
 * SmartTextLayer Component
 *
 * Renders all text blocks for a single PDF page
 * Handles:
 * - Multi-column layout with CSS grid
 * - Cross-block text selection
 * - Translation state management
 * - Highlight rendering
 */
export function SmartTextLayer({
  layout,
  scale,
  baseWidth,
  baseHeight,
  highlights = new Map(),
  onSelectionChange,
  onTranslationToggle,
  showColumnGrid = false,
  className,
}: SmartTextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlockId] = useState<string | null>(null);

  // Calculate scaled dimensions
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  // Handle selection across multiple blocks
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      onSelectionChange?.(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Find start and end blocks
    const startBlock = findBlockElement(range.startContainer);
    const endBlock = findBlockElement(range.endContainer);

    if (!startBlock || !endBlock) {
      return;
    }

    const startBlockId = startBlock.dataset.blockId;
    const endBlockId = endBlock.dataset.blockId;

    if (!startBlockId || !endBlockId) {
      return;
    }

    // Get all blocks between start and end
    const blockElements = Array.from(
      container.querySelectorAll("[data-block-id]"),
    );
    const startIndex = blockElements.indexOf(startBlock);
    const endIndex = blockElements.indexOf(endBlock);

    const selectedBlockIds = blockElements
      .slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1)
      .map((el) => (el as HTMLElement).dataset.blockId!)
      .filter(Boolean);

    // Calculate offsets
    const startOffset = calculateOffset(
      range.startContainer,
      range.startOffset,
      startBlock,
    );
    const endOffset = calculateOffset(
      range.endContainer,
      range.endOffset,
      endBlock,
    );

    // Get position for toolbar
    const rect = range.getBoundingClientRect();

    onSelectionChange?.({
      blockIds: selectedBlockIds,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      selectedText: selection.toString(),
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
    });
  }, [onSelectionChange]);

  // Handle block-level selection
  const handleBlockSelection = useCallback(
    (
      selection: {
        blockId: string;
        start: number;
        end: number;
        text: string;
      } | null,
    ) => {
      if (!selection) {
        onSelectionChange?.(null);
        return;
      }

      // Get position from current selection
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const rect = sel.getRangeAt(0).getBoundingClientRect();

      onSelectionChange?.({
        blockIds: [selection.blockId],
        startBlockId: selection.blockId,
        startOffset: selection.start,
        endBlockId: selection.blockId,
        endOffset: selection.end,
        selectedText: selection.text,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        },
      });
    },
    [onSelectionChange],
  );

  const numColumns = layout.columns || 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        "smart-text-layer absolute inset-0",
        "text-foreground",
        className,
      )}
      style={{
        width,
        height,
        fontSize: `${Math.max(12, 14 * scale)}px`,
        lineHeight: 1.5,
      }}
      onMouseUp={handleMouseUp}
    >
      {/* Column grid for debugging */}
      {showColumnGrid && numColumns > 1 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
            gap: "2%",
            padding: "5%",
          }}
        >
          {Array.from({ length: numColumns }).map((_, i) => (
            <div
              key={i}
              className="border border-dashed border-primary/20 rounded"
            />
          ))}
        </div>
      )}

      {/* Render blocks */}
      {layout.blocks.map((block) => (
        <TextBlock
          key={block.id}
          block={block}
          isHovered={hoveredBlockId === block.id}
          highlightRanges={highlights.get(block.id) || []}
          onTranslationToggle={onTranslationToggle}
          onSelectionChange={handleBlockSelection}
        />
      ))}
    </div>
  );
}

/**
 * Find the parent block element for a node
 */
function findBlockElement(node: Node): HTMLElement | null {
  let current: Node | null = node;

  while (current) {
    if (current instanceof HTMLElement && current.dataset.blockId) {
      return current;
    }
    current = current.parentNode;
  }

  return null;
}

/**
 * Calculate character offset within a block
 */
function calculateOffset(
  container: Node,
  offset: number,
  blockElement: HTMLElement,
): number {
  const walker = document.createTreeWalker(
    blockElement,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let charCount = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node === container) {
      return charCount + offset;
    }
    charCount += node.textContent?.length || 0;
  }

  return charCount;
}

export default SmartTextLayer;
