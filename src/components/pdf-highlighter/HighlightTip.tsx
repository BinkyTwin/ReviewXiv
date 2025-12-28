"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Highlighter,
  MessageSquare,
  Languages,
  X,
  ChevronDown,
} from "lucide-react";
import type { HighlightColor } from "@/types/highlight";
import type { HighlightTipProps } from "./types";
import { cn } from "@/lib/utils";

const COLORS: { value: HighlightColor; label: string; class: string }[] = [
  { value: "yellow", label: "Yellow", class: "bg-yellow-400" },
  { value: "green", label: "Green", class: "bg-green-400" },
  { value: "blue", label: "Blue", class: "bg-blue-400" },
  { value: "red", label: "Red", class: "bg-red-400" },
  { value: "purple", label: "Purple", class: "bg-purple-400" },
];

const KEYBOARD_SHORTCUTS: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
};

export function HighlightTip({
  content,
  onConfirm,
  onAsk,
  onTranslate,
  onDismiss,
}: HighlightTipProps) {
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("yellow");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedColor);
  }, [selectedColor, onConfirm]);

  const handleAsk = useCallback(() => {
    onAsk?.();
    onDismiss();
  }, [onAsk, onDismiss]);

  const handleTranslate = useCallback(() => {
    onTranslate?.();
    onDismiss();
  }, [onTranslate, onDismiss]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "escape":
          onDismiss();
          break;
        case "h":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleConfirm();
          }
          break;
        case "a":
          if (!e.metaKey && !e.ctrlKey && onAsk) {
            e.preventDefault();
            handleAsk();
          }
          break;
        case "t":
          if (!e.metaKey && !e.ctrlKey && onTranslate) {
            e.preventDefault();
            handleTranslate();
          }
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const colorIndex = KEYBOARD_SHORTCUTS[e.key];
            if (colorIndex !== undefined && COLORS[colorIndex]) {
              setSelectedColor(COLORS[colorIndex].value);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleConfirm,
    handleAsk,
    handleTranslate,
    onDismiss,
    onAsk,
    onTranslate,
  ]);

  return (
    <div className="glass rounded-xl shadow-lg p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
      {/* Highlight button with color picker */}
      <div className="relative">
        <div className="flex items-center">
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            title="Highlight (H)"
          >
            <Highlighter className="h-4 w-4" />
            <span className="text-xs font-medium">Highlight</span>
            <div
              className={cn(
                "w-3 h-3 rounded-full border border-white/50",
                COLORS.find((c) => c.value === selectedColor)?.class,
              )}
            />
          </button>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-1 py-1.5 hover:bg-muted/50 rounded-r-lg transition-colors"
            title="Choose color (1-5)"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-1.5 glass rounded-lg shadow-lg flex gap-1 z-50">
            {COLORS.map((color, index) => (
              <button
                key={color.value}
                onClick={() => {
                  setSelectedColor(color.value);
                  setShowColorPicker(false);
                }}
                className={cn(
                  "w-6 h-6 rounded-full transition-transform hover:scale-110",
                  color.class,
                  selectedColor === color.value &&
                    "ring-2 ring-white ring-offset-2 ring-offset-card",
                )}
                title={`${color.label} (${index + 1})`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Ask AI button */}
      {onAsk && (
        <button
          onClick={handleAsk}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          title="Ask AI (A)"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-medium">Ask</span>
        </button>
      )}

      {/* Translate button */}
      {onTranslate && (
        <button
          onClick={handleTranslate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          title="Translate (T)"
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">Translate</span>
        </button>
      )}

      <div className="w-px h-5 bg-border" />

      {/* Close button */}
      <button
        onClick={onDismiss}
        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
