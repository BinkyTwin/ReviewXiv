"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PDFToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onScaleChange: (scale: number) => void;
  onPageChange: (page: number) => void;
}

export function PDFToolbar({
  currentPage,
  numPages,
  scale,
  onScaleChange,
  onPageChange,
}: PDFToolbarProps) {
  const zoomIn = () => {
    onScaleChange(Math.min(scale + 0.2, 3));
  };

  const zoomOut = () => {
    onScaleChange(Math.max(scale - 0.2, 0.5));
  };

  const resetZoom = () => {
    onScaleChange(1.2);
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (page >= 1 && page <= numPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          disabled={scale <= 0.5}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
          {Math.round(scale * 100)}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          disabled={scale >= 3}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={resetZoom}
          title="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={numPages}
          value={currentPage}
          onChange={handlePageInput}
          className="w-16 h-8 text-center"
        />
        <span className="text-sm text-muted-foreground">/ {numPages}</span>
      </div>
    </div>
  );
}
