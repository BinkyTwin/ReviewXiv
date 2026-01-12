"use client";

import { ScanLine, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TranslationLanguage } from "@/types/translation";

interface ZoomToolbarProps {
  /** Current zoom level (1 = fit width) */
  zoomLevel: number;
  /** Callback when zoom in is clicked */
  onZoomIn?: () => void;
  /** Callback when zoom out is clicked */
  onZoomOut?: () => void;
  /** Callback when fit to width is clicked */
  onFitWidth?: () => void;
  /** Whether zoom controls should be disabled */
  disableZoom?: boolean;
  /** Whether zoom in is allowed */
  canZoomIn?: boolean;
  /** Whether zoom out is allowed */
  canZoomOut?: boolean;
  /** Whether area selection mode is active */
  areaSelectionMode?: boolean;
  /** Callback to toggle area selection mode */
  onToggleAreaSelection?: () => void;
  /** Active translation target language */
  translationLanguage?: TranslationLanguage;
  /** Available translation languages */
  translationLanguageOptions?: ReadonlyArray<{
    value: TranslationLanguage;
    label: string;
  }>;
  /** Callback when translation language changes */
  onTranslationLanguageChange?: (language: TranslationLanguage) => void;
  /** Additional CSS classes */
  className?: string;
}

export function ZoomToolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  disableZoom = false,
  canZoomIn = true,
  canZoomOut = true,
  areaSelectionMode = false,
  onToggleAreaSelection,
  translationLanguage,
  translationLanguageOptions,
  onTranslationLanguageChange,
  className,
}: ZoomToolbarProps) {
  const isFitWidth = Math.abs(zoomLevel - 1) < 0.01;
  const zoomLabel = Number.isFinite(zoomLevel)
    ? `${Math.round(zoomLevel * 100)}%`
    : "--";

  return (
    <div
      className={cn(
        "absolute top-2 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-1 px-2 py-1",
        "bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onZoomOut}
          disabled={disableZoom || !onZoomOut || !canZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {zoomLabel}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onZoomIn}
          disabled={disableZoom || !onZoomIn || !canZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onFitWidth}
          disabled={disableZoom || !onFitWidth || isFitWidth}
          title="Fit width"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {onToggleAreaSelection && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant={areaSelectionMode ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-2",
              areaSelectionMode && "bg-primary/20 text-primary",
            )}
            onClick={onToggleAreaSelection}
            title={
              areaSelectionMode
                ? "Exit area selection (Escape)"
                : "Select area for figures/tables (Alt+drag)"
            }
          >
            <ScanLine className="h-4 w-4" />
            <span className="text-xs">
              {areaSelectionMode ? "Exit selection" : "Capture figure"}
            </span>
          </Button>
        </>
      )}

      {translationLanguage &&
        translationLanguageOptions &&
        onTranslationLanguageChange && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Langue</span>
              <Select
                value={translationLanguage}
                onValueChange={(value) =>
                  onTranslationLanguageChange(value as TranslationLanguage)
                }
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {translationLanguageOptions.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
    </div>
  );
}
