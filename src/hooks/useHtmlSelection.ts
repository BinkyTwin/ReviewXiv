"use client";

import { useCallback, useEffect, useState } from "react";
import { getOffsetsForRange } from "@/lib/html/selection";

export interface HtmlSelectionState {
  sectionId: string;
  text: string;
  range: Range;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
}

interface UseHtmlSelectionOptions {
  containerRef: React.RefObject<HTMLElement>;
}

function findSectionElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node instanceof HTMLElement) {
    return node.closest("[data-section-id]");
  }
  return node.parentElement?.closest("[data-section-id]") ?? null;
}

export function useHtmlSelection({ containerRef }: UseHtmlSelectionOptions) {
  const [selection, setSelection] = useState<HtmlSelectionState | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    const selectionRef = window.getSelection();
    selectionRef?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const selectionRef = window.getSelection();
      if (!selectionRef || selectionRef.isCollapsed) {
        setSelection(null);
        return;
      }

      const range = selectionRef.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        return;
      }

      const startSection = findSectionElement(range.startContainer);
      const endSection = findSectionElement(range.endContainer);

      if (!startSection || startSection !== endSection) {
        setSelection(null);
        return;
      }

      const sectionId = startSection.getAttribute("data-section-id");
      if (!sectionId) {
        setSelection(null);
        return;
      }

      const offsets = getOffsetsForRange(startSection, range);
      if (!offsets) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const text = selectionRef.toString();

      if (!text.trim()) {
        setSelection(null);
        return;
      }

      setSelection({
        sectionId,
        text,
        range,
        startOffset: offsets.start,
        endOffset: offsets.end,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      });
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [containerRef]);

  return { selection, clearSelection };
}
