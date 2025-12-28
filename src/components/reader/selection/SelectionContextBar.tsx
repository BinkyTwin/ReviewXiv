"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Highlighter,
  MessageSquare,
  Languages,
  Copy,
  X,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { HighlightColor } from "@/types/highlight";

interface SelectionContextBarProps {
  /** Position for the context bar */
  position: { x: number; y: number };
  /** Selected text */
  selectedText: string;
  /** Callback when highlight color is selected */
  onHighlight: (color: HighlightColor) => void;
  /** Callback when comment/annotation is requested */
  onComment?: () => void;
  /** Callback when ask AI is triggered */
  onAsk: () => void;
  /** Callback when translate is triggered */
  onTranslate: () => void;
  /** Callback when copy is triggered */
  onCopy?: () => void;
  /** Callback to close the bar */
  onClose: () => void;
  /** Show compact mode (icons only) */
  compact?: boolean;
}

const HIGHLIGHT_COLORS: {
  color: HighlightColor;
  label: string;
  cssVar: string;
  key: string;
}[] = [
  { color: "yellow", label: "Jaune", cssVar: "--highlight-yellow", key: "1" },
  { color: "green", label: "Vert", cssVar: "--highlight-green", key: "2" },
  { color: "blue", label: "Bleu", cssVar: "--highlight-blue", key: "3" },
  { color: "red", label: "Rouge", cssVar: "--highlight-red", key: "4" },
  { color: "purple", label: "Violet", cssVar: "--highlight-purple", key: "5" },
];

/**
 * SelectionContextBar Component
 *
 * An improved selection toolbar with:
 * - Keyboard shortcuts (H, C, T, A, Esc)
 * - Visual labels and icons
 * - Smooth animations
 * - Color picker for highlights
 */
export function SelectionContextBar({
  position,
  selectedText,
  onHighlight,
  onComment,
  onAsk,
  onTranslate,
  onCopy,
  onClose,
  compact = false,
}: SelectionContextBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedText);
    onCopy?.();
    onClose();
  }, [selectedText, onCopy, onClose]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "escape":
          onClose();
          break;
        case "h":
          // Open color picker or highlight with default yellow
          if (event.shiftKey) {
            setIsColorPickerOpen(true);
          } else {
            onHighlight("yellow");
            onClose();
          }
          break;
        case "c":
          if (event.metaKey || event.ctrlKey) {
            // Cmd+C / Ctrl+C = copy
            handleCopy();
          } else {
            // C alone = comment
            onComment?.();
            onClose();
          }
          break;
        case "t":
          onTranslate();
          onClose();
          break;
        case "a":
          onAsk();
          onClose();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          if (isColorPickerOpen) {
            const colorIndex = parseInt(event.key) - 1;
            const color = HIGHLIGHT_COLORS[colorIndex];
            if (color) {
              onHighlight(color.color);
              onClose();
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    onClose,
    onHighlight,
    onComment,
    onAsk,
    onTranslate,
    handleCopy,
    isColorPickerOpen,
  ]);

  // Close when clicking outside
  // Note: We need to check for dropdown portal elements too (data-radix-popper-content-wrapper)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is inside the bar
      if (barRef.current && barRef.current.contains(target)) {
        return;
      }

      // Check if click is inside a Radix dropdown portal (color picker, etc.)
      if (target.closest("[data-radix-popper-content-wrapper]")) {
        return;
      }

      // Check if click is inside any dropdown menu content
      if (target.closest("[role='menu']")) {
        return;
      }

      onClose();
    };

    // Use mousedown but with delay to allow click events to fire first
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.max(150, Math.min(position.x, window.innerWidth - 150)),
    y: Math.max(80, position.y),
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "fixed z-[60] flex items-center gap-1.5 p-1.5",
        "bg-card/95 border border-border/80 rounded-xl shadow-2xl",
        "backdrop-blur",
        "transition-all duration-150 ease-out",
        isVisible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2",
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Highlight button with color picker */}
      <DropdownMenu
        open={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 hover:bg-muted",
              compact ? "h-8 w-8 p-0" : "h-8 px-2",
            )}
            title="Surligner (H)"
          >
            <Highlighter className="h-4 w-4" />
            {!compact && (
              <>
                <span className="text-xs">Surligner</span>
                <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                  H
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-0 p-2">
          <div className="flex gap-1.5">
            {HIGHLIGHT_COLORS.map(({ color, label, cssVar, key }) => (
              <button
                key={color}
                onClick={() => {
                  onHighlight(color);
                  onClose();
                }}
                className={cn(
                  "w-7 h-7 rounded-md transition-all",
                  "hover:ring-2 hover:ring-offset-2 hover:ring-foreground/20",
                  "focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  "relative group",
                )}
                style={{
                  backgroundColor: `hsl(var(${cssVar}) / 0.9)`,
                }}
                title={`${label} (${key})`}
              >
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {key}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Appuyez sur 1-5 pour choisir
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Comment button */}
      {onComment && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 hover:bg-muted",
            compact ? "h-8 w-8 p-0" : "h-8 px-2",
          )}
          onClick={() => {
            onComment();
            onClose();
          }}
          title="Commenter (C)"
        >
          <MessageCircle className="h-4 w-4" />
          {!compact && (
            <>
              <span className="text-xs">Commenter</span>
              <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                C
              </span>
            </>
          )}
        </Button>
      )}

      {/* Translate button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 hover:bg-muted",
          compact ? "h-8 w-8 p-0" : "h-8 px-2",
        )}
        onClick={() => {
          onTranslate();
          onClose();
        }}
        title="Traduire (T)"
      >
        <Languages className="h-4 w-4" />
        {!compact && (
          <>
            <span className="text-xs">Traduire</span>
            <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
              T
            </span>
          </>
        )}
      </Button>

      {/* Ask AI button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 hover:bg-muted",
          compact ? "h-8 w-8 p-0" : "h-8 px-2",
        )}
        onClick={() => {
          onAsk();
          onClose();
        }}
        title="Demander a l'IA (A)"
      >
        <MessageSquare className="h-4 w-4" />
        {!compact && (
          <>
            <span className="text-xs">Demander</span>
            <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
              A
            </span>
          </>
        )}
      </Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Copy button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-muted"
        onClick={handleCopy}
        title="Copier (Cmd+C)"
      >
        <Copy className="h-4 w-4" />
      </Button>

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground"
        onClick={onClose}
        title="Fermer (Esc)"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default SelectionContextBar;
