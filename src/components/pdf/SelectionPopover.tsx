"use client";

import { useEffect, useRef } from "react";
import { Highlighter, MessageSquare, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HighlightColor } from "@/types/highlight";

interface SelectionPopoverProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onAsk: () => void;
  onTranslate: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; bg: string }[] =
  [
    { color: "yellow", label: "Jaune", bg: "bg-yellow-400" },
    { color: "green", label: "Vert", bg: "bg-green-500" },
    { color: "blue", label: "Bleu", bg: "bg-blue-500" },
    { color: "red", label: "Rouge", bg: "bg-red-500" },
    { color: "purple", label: "Violet", bg: "bg-purple-500" },
  ];

export function SelectionPopover({
  position,
  onHighlight,
  onAsk,
  onTranslate,
  onClose,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Close on escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.max(100, Math.min(position.x, window.innerWidth - 100)),
    y: Math.max(60, position.y),
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex items-center gap-1 p-1 bg-card border border-border rounded-lg shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Highlight button with color picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            title="Surligner"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-0">
          <div className="flex gap-1 p-1">
            {HIGHLIGHT_COLORS.map(({ color, label, bg }) => (
              <button
                key={color}
                onClick={() => {
                  onHighlight(color);
                  onClose();
                }}
                className={`w-6 h-6 rounded ${bg} hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20 transition-all`}
                title={label}
              />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ask button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-muted"
        onClick={() => {
          onAsk();
          onClose();
        }}
        title="Poser une question"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Translate button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-muted"
        onClick={() => {
          onTranslate();
          onClose();
        }}
        title="Traduire"
      >
        <Languages className="h-4 w-4" />
      </Button>
    </div>
  );
}
