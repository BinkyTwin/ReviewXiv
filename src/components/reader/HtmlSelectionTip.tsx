"use client";

import type { HighlightColor } from "@/types/highlight";
import type { HtmlSelectionState } from "@/hooks/useHtmlSelection";
import { SelectionContextBar } from "@/components/reader/selection/SelectionContextBar";

interface HtmlSelectionTipProps {
  selection: HtmlSelectionState;
  onHighlight: (color: HighlightColor) => void;
  onAsk: () => void;
  onTranslate: () => void;
  onClose: () => void;
}

export function HtmlSelectionTip({
  selection,
  onHighlight,
  onAsk,
  onTranslate,
  onClose,
}: HtmlSelectionTipProps) {
  return (
    <SelectionContextBar
      position={selection.position}
      selectedText={selection.text}
      onHighlight={onHighlight}
      onAsk={onAsk}
      onTranslate={onTranslate}
      onClose={onClose}
    />
  );
}
