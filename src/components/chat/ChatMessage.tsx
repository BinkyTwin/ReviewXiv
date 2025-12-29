"use client";

import { Highlighter, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
    <div className={cn("flex w-full mb-6 animate-in", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%]", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 shadow-sm transition-all",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-card border border-border/50 rounded-tl-none apple-shadow",
            )}
          >
            {/* Image preview for user messages */}
            {imageData && isUser && (
              <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                <img
                  src={imageData}
                  alt="Attached image"
                  className="max-w-full max-h-[240px] object-contain"
                />
              </div>
            )}
            
            <div className={cn(
              "text-[14.5px] leading-relaxed prose prose-sm max-w-none",
              isUser ? "prose-invert" : "dark:prose-invert",
              "prose-p:my-1 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>

          {citations && citations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {citations.map((citation, index) => (
                <div key={index} className="flex items-center gap-1.5 animate-in">
                  <button
                    onClick={() => onCitationClick?.(citation)}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 transition-all apple-shadow active:scale-95"
                  >
                    Source p. {citation.page}
                  </button>
                  {onSaveCitation && (
                    <button
                      onClick={() => onSaveCitation(citation)}
                      className="inline-flex items-center p-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 transition-all active:scale-95"
                      title="Enregistrer comme note"
                    >
                      <Highlighter className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
