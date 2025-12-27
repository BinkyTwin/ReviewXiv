"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TextBlock as TextBlockType } from "@/lib/ocr/types";

interface TextBlockProps {
  block: TextBlockType;
  /** Is this block currently being hovered */
  isHovered?: boolean;
  /** Is part of this block highlighted */
  highlightRanges?: { start: number; end: number; color: string }[];
  /** Callback when translation is toggled */
  onTranslationToggle?: (blockId: string, showTranslation: boolean) => void;
  /** Callback when text is selected in this block */
  onSelectionChange?: (
    selection: {
      blockId: string;
      start: number;
      end: number;
      text: string;
    } | null,
  ) => void;
}

/**
 * TextBlock Component
 *
 * Renders a single text block from OCR output
 * Supports:
 * - Different block types (heading, paragraph, list, table, etc.)
 * - Inline translation toggle
 * - Text selection
 * - Highlights
 */
export function TextBlock({
  block,
  isHovered = false,
  highlightRanges = [],
  onTranslationToggle,
  onSelectionChange,
}: TextBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [showTranslation, setShowTranslation] = useState(block.isTranslated);

  // Calculate pixel positions from normalized values
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${block.position.x * 100}%`,
    top: `${block.position.y * 100}%`,
    width: `${block.position.width * 100}%`,
    minHeight: `${block.position.height * 100}%`,
  };

  // Handle translation toggle
  const handleTranslationToggle = useCallback(() => {
    if (!block.translation) return;
    const newValue = !showTranslation;
    setShowTranslation(newValue);
    onTranslationToggle?.(block.id, newValue);
  }, [block.id, block.translation, showTranslation, onTranslationToggle]);

  // Handle selection within this block
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      onSelectionChange?.(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const blockElement = blockRef.current;

    if (
      !blockElement ||
      !blockElement.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    // Calculate offsets within the block content
    const walker = document.createTreeWalker(
      blockElement,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let charCount = 0;
    let startOffset = 0;
    let endOffset = 0;
    let foundStart = false;
    let foundEnd = false;

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent?.length || 0;

      if (node === range.startContainer) {
        startOffset = charCount + range.startOffset;
        foundStart = true;
      }

      if (node === range.endContainer) {
        endOffset = charCount + range.endOffset;
        foundEnd = true;
        break;
      }

      charCount += nodeLength;
    }

    if (foundStart && foundEnd && startOffset !== endOffset) {
      onSelectionChange?.({
        blockId: block.id,
        start: startOffset,
        end: endOffset,
        text: selection.toString(),
      });
    }
  }, [block.id, onSelectionChange]);

  // Render content with highlights
  const renderContent = useCallback(() => {
    const content =
      showTranslation && block.translation ? block.translation : block.content;

    if (highlightRanges.length === 0) {
      return content;
    }

    // Apply highlights
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedRanges = [...highlightRanges].sort((a, b) => a.start - b.start);

    sortedRanges.forEach((range, i) => {
      if (range.start > lastIndex) {
        parts.push(content.slice(lastIndex, range.start));
      }

      parts.push(
        <mark
          key={`highlight-${i}`}
          className={cn("rounded-sm", getHighlightClass(range.color))}
        >
          {content.slice(range.start, range.end)}
        </mark>,
      );

      lastIndex = range.end;
    });

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  }, [block.content, block.translation, showTranslation, highlightRanges]);

  // Get CSS classes based on block type
  const blockClasses = cn(
    "text-block select-text cursor-text transition-colors duration-200",
    {
      "text-xl font-bold": block.type === "heading" && block.level === 1,
      "text-lg font-semibold": block.type === "heading" && block.level === 2,
      "text-base font-medium":
        block.type === "heading" && (block.level || 0) >= 3,
      "text-sm leading-relaxed": block.type === "paragraph",
      "text-sm italic text-muted-foreground": block.type === "caption",
      "font-mono text-sm": block.type === "equation",
      "text-xs text-muted-foreground": block.type === "footnote",
      "bg-card/50": isHovered,
    },
  );

  return (
    <div
      ref={blockRef}
      style={style}
      className={blockClasses}
      data-block-id={block.id}
      data-block-type={block.type}
      onMouseUp={handleMouseUp}
    >
      {/* Translation toggle button */}
      {block.translation && (
        <button
          onClick={handleTranslationToggle}
          className={cn(
            "absolute -right-2 -top-2 z-10 rounded-full p-1",
            "bg-primary/10 hover:bg-primary/20 transition-colors",
            "text-xs text-primary opacity-0 group-hover:opacity-100",
            isHovered && "opacity-100",
          )}
          title={showTranslation ? "Show original" : "Show translation"}
        >
          {showTranslation ? "🔄" : "🌐"}
        </button>
      )}

      {/* Main content */}
      {block.type === "list" ? (
        <ul className="list-disc list-inside space-y-1">
          {block.content.split("\n").map((item, i) => (
            <li key={i} className="text-sm">
              {item.replace(/^\d+\.\s*/, "")}
            </li>
          ))}
        </ul>
      ) : block.type === "table" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <tbody>
              {block.content.split("\n").map((row, i) => (
                <tr key={i}>
                  {row
                    .split("|")
                    .filter(Boolean)
                    .map((cell, j) => (
                      <td key={j} className="border border-border px-2 py-1">
                        {cell.trim()}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <span>{renderContent()}</span>
      )}

      {/* Translation indicator */}
      {showTranslation && (
        <span className="ml-2 text-xs text-muted-foreground">(translated)</span>
      )}
    </div>
  );
}

/**
 * Get highlight CSS class based on color
 */
function getHighlightClass(color: string): string {
  const colorMap: Record<string, string> = {
    yellow: "highlight-yellow",
    green: "highlight-green",
    blue: "highlight-blue",
    red: "highlight-red",
    purple: "highlight-purple",
    orange: "highlight-orange",
  };
  return colorMap[color] || colorMap.yellow;
}

export default TextBlock;
