"use client";

import { useState } from "react";
import { Save, MessageSquare, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AreaSelectionTipProps {
  /** Base64 PNG data URL of the captured image */
  imageData: string;
  /** Callback to save the area as a highlight */
  onSave?: () => void;
  /** Callback to send the image to chat for AI analysis */
  onAsk?: () => void;
  /** Callback to dismiss the selection */
  onDismiss: () => void;
  /** Whether save action is loading */
  isSaving?: boolean;
  /** Whether ask action is loading */
  isAsking?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function AreaSelectionTip({
  imageData,
  onSave,
  onAsk,
  onDismiss,
  isSaving = false,
  isAsking = false,
  className,
}: AreaSelectionTipProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2",
        "bg-card border border-border rounded-lg shadow-lg",
        "min-w-[200px] max-w-[300px]",
        className,
      )}
    >
      {/* Image preview */}
      <div className="relative bg-muted rounded overflow-hidden">
        {!imageError ? (
          <img
            src={imageData}
            alt="Selected area"
            className="w-full h-auto max-h-[150px] object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Preview unavailable
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {/* Save as highlight */}
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 gap-1"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              <span className="text-xs">Save</span>
            </Button>
          )}

          {/* Ask AI about this image */}
          {onAsk && (
            <Button
              variant="default"
              size="sm"
              onClick={onAsk}
              disabled={isAsking}
              className="h-8 gap-1"
            >
              {isAsking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MessageSquare className="h-3 w-3" />
              )}
              <span className="text-xs">Ask AI</span>
            </Button>
          )}
        </div>

        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-[10px] text-muted-foreground text-center">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd>{" "}
        to cancel
      </p>
    </div>
  );
}
