"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TextSelection } from "@/lib/ocr/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, RotateCcw, Copy, Check } from "lucide-react";

const LANGUAGES = [
  { code: "fr", name: "French" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "ar", name: "Arabic" },
] as const;

interface InlineTranslationProps {
  /** The selection to translate */
  selection: TextSelection;
  /** Position to display the widget */
  position: { x: number; y: number };
  /** Called when translation is applied */
  onApply: (blockId: string, translation: string) => void;
  /** Called when closed */
  onClose: () => void;
}

/**
 * InlineTranslation
 *
 * A compact inline widget for translating selected text
 * Shows the translation inline with the original text
 *
 * Features:
 * - Language selector
 * - Loading state
 * - Copy translation
 * - Apply inline (swap text in document)
 */
export function InlineTranslation({
  selection,
  position,
  onApply,
  onClose,
}: InlineTranslationProps) {
  const [targetLanguage, setTargetLanguage] = useState<string>("fr");
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Calculate adjusted position
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!widgetRef.current) return;

    const widgetWidth = 320;
    const widgetHeight = 200;
    const padding = 10;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x - widgetWidth / 2;
    let y = position.y + 20; // Below selection

    // Keep in bounds
    if (x < padding) x = padding;
    if (x + widgetWidth > viewportWidth - padding) {
      x = viewportWidth - widgetWidth - padding;
    }
    if (y + widgetHeight > viewportHeight - padding) {
      y = position.y - widgetHeight - padding; // Above selection
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  // Translate text
  const translate = useCallback(async () => {
    if (!selection.selectedText) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selection.selectedText,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setTranslation(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsLoading(false);
    }
  }, [selection.selectedText, targetLanguage]);

  // Auto-translate when language changes
  useEffect(() => {
    if (selection.selectedText) {
      translate();
    }
  }, [targetLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial translation
  useEffect(() => {
    translate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!translation) return;

    await navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [translation]);

  // Handle apply (inline swap)
  const handleApply = useCallback(() => {
    if (!translation || selection.blockIds.length === 0) return;

    // Apply to the first block for now
    // TODO: Handle multi-block selections
    onApply(selection.blockIds[0], translation);
    onClose();
  }, [translation, selection.blockIds, onApply, onClose]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 w-80",
        "bg-card border border-border rounded-lg shadow-xl",
        "animate-in fade-in-0 zoom-in-95 duration-150",
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Translate to</span>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Original text */}
      <div className="p-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-1">Original</p>
        <p className="text-sm line-clamp-3">{selection.selectedText}</p>
      </div>

      {/* Translation */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-1">Translation</p>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Translating...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 text-destructive">
            <span className="text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={translate}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : translation ? (
          <p className="text-sm text-primary">{translation}</p>
        ) : null}
      </div>

      {/* Actions */}
      {translation && !isLoading && (
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-1 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleApply} className="bg-primary">
            Apply Inline
          </Button>
        </div>
      )}
    </div>
  );
}

export default InlineTranslation;
