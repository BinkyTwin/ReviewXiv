"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TextSelection } from "@/lib/ocr/types";
import { Button } from "@/components/ui/button";
import {
  Highlighter,
  MessageSquare,
  Languages,
  X,
  ChevronDown,
} from "lucide-react";

const HIGHLIGHT_COLORS = [
  { name: "yellow", class: "bg-highlight-yellow" },
  { name: "green", class: "bg-highlight-green" },
  { name: "blue", class: "bg-highlight-blue" },
  { name: "red", class: "bg-highlight-red" },
  { name: "purple", class: "bg-highlight-purple" },
] as const;

interface SelectionToolbarProps {
  /** Current selection */
  selection: TextSelection;
  /** Called when user wants to highlight */
  onHighlight: (color: string) => void;
  /** Called when user wants to ask */
  onAsk: () => void;
  /** Called when user wants to translate */
  onTranslate: () => void;
  /** Called when toolbar is closed */
  onClose: () => void;
}

/**
 * SelectionToolbar
 *
 * Inline toolbar that appears when text is selected
 * Replaces the old popover-style selection UI
 *
 * Features:
 * - Follows selection position
 * - Highlight color picker
 * - Ask and Translate buttons
 * - Keyboard shortcuts
 * - Auto-close on outside click
 */
export function SelectionToolbar({
  selection,
  onHighlight,
  onAsk,
  onTranslate,
  onClose,
}: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth,
  );

  const position = useMemo(() => {
    if (!selection.position) {
      return { x: 0, y: 0 };
    }

    const { x, y } = selection.position;

    // Adjust to keep toolbar in viewport
    const toolbarWidth = 280;
    const toolbarHeight = 48;
    const padding = 10;

    let adjustedX = x - toolbarWidth / 2;
    let adjustedY = y - toolbarHeight - padding;

    // Keep in horizontal bounds
    if (adjustedX < padding) adjustedX = padding;
    if (adjustedX + toolbarWidth > viewportWidth - padding) {
      adjustedX = viewportWidth - toolbarWidth - padding;
    }

    // If would go above viewport, show below selection
    if (adjustedY < padding) {
      adjustedY = y + padding + 20; // Below selection
    }

    return { x: adjustedX, y: adjustedY };
  }, [selection.position, viewportWidth]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "h" && !e.metaKey && !e.ctrlKey) {
        // 'h' for highlight (default yellow)
        onHighlight("yellow");
      } else if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        // 'a' for ask
        onAsk();
      } else if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        // 't' for translate
        onTranslate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onHighlight, onAsk, onTranslate]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        // Small delay to allow other click handlers to fire first
        setTimeout(() => {
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed) {
            onClose();
          }
        }, 100);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle highlight with color
  const handleHighlightClick = useCallback(
    (color?: string) => {
      if (color) {
        onHighlight(color);
        setShowColors(false);
      } else {
        setShowColors((v) => !v);
      }
    },
    [onHighlight],
  );

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-[110]",
        "flex items-center gap-1 p-1.5",
        "glass rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)]",
        "animate-in fade-in-0 zoom-in-95 duration-150",
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Highlight button with color picker */}
      <div className="relative group/highlight">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleHighlightClick("yellow")}
            title="Highlight (H)"
            className="gap-2 h-9 px-3 hover:bg-highlight-yellow/10"
          >
            <Highlighter className="h-4 w-4 text-highlight-yellow" />
            <span className="text-xs font-semibold">Surligner</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-7 -ml-2 hover:bg-highlight-yellow/10"
            onClick={() => setShowColors((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform text-muted-foreground",
                showColors && "rotate-180",
              )}
            />
          </Button>
        </div>

        {/* Color picker dropdown */}
        {showColors && (
          <div
            className={cn(
              "absolute top-full left-0 mt-2",
              "flex gap-2 p-2",
              "glass rounded-xl shadow-2xl border border-white/10",
              "animate-in fade-in-0 slide-in-from-top-2",
            )}
          >
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleHighlightClick(color.name)}
                className={cn(
                  "w-8 h-8 rounded-full",
                  color.class,
                  "border-2 border-white/20 shadow-sm",
                  "hover:scale-110 hover:border-white/40 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                )}
                title={`${color.name.charAt(0).toUpperCase() + color.name.slice(1)} highlight`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Ask button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAsk}
        title="Ask about this (A)"
        className="gap-2 h-9 px-3 hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="text-xs font-semibold">Demander</span>
      </Button>

      {/* Translate button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onTranslate}
        title="Translate (T)"
        className="gap-2 h-9 px-3 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
      >
        <Languages className="h-4 w-4" />
        <span className="text-xs font-semibold">Traduire</span>
      </Button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        title="Close (Esc)"
        className="h-9 w-9 hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export default SelectionToolbar;
