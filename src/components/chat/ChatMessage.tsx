"use client";

import { Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/citation";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
  onSaveCitation?: (citation: Citation) => void;
  /** Image attached to user message (base64 data URL) */
  imageData?: string;
}

export function ChatMessage({
  role,
  content,
  citations,
  onCitationClick,
  onSaveCitation,
  imageData,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border",
        )}
      >
        {/* Image preview for user messages */}
        {imageData && isUser && (
          <div className="mb-2 rounded overflow-hidden bg-black/10">
            <img
              src={imageData}
              alt="Attached image"
              className="max-w-full max-h-[200px] object-contain"
            />
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{content}</p>

        {citations && citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {citations.map((citation, index) => (
                <div key={index} className="flex items-center gap-1">
                  <button
                    onClick={() => onCitationClick?.(citation)}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    title={citation.quote}
                  >
                    Page {citation.page}
                  </button>
                  {onSaveCitation && (
                    <button
                      onClick={() => onSaveCitation(citation)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                      title="Sauvegarder comme highlight"
                    >
                      <Highlighter className="h-3 w-3" />
                      Sauvegarder
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
