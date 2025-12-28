"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { Send, Loader2, MessageSquare } from "lucide-react";
import type { Citation } from "@/types/citation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  /** Base64 image data URL for user messages with images */
  imageData?: string;
}

interface ChatPanelProps {
  paperId: string;
  pages: Array<{ pageNumber: number; textContent: string }>;
  onCitationClick?: (citation: Citation) => void;
  onSaveCitation?: (citation: Citation) => void;
  highlightContext?: { page: number; text: string } | null;
  onHighlightContextClear?: () => void;
  /** Image context for vision analysis (base64 PNG, page number) */
  imageContext?: { imageData: string; page: number } | null;
  /** Clear image context after sending */
  onImageContextClear?: () => void;
}

export function ChatPanel({
  paperId,
  pages,
  onCitationClick,
  onSaveCitation,
  highlightContext,
  onHighlightContextClear,
  imageContext,
  onImageContextClear,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Pre-fill input when highlightContext changes
  useEffect(() => {
    if (highlightContext) {
      const excerpt =
        highlightContext.text.length > 100
          ? highlightContext.text.slice(0, 100) + "..."
          : highlightContext.text;
      setInput(
        `À propos de ce passage (page ${highlightContext.page}) : "${excerpt}"\n\n`,
      );
    }
  }, [highlightContext]);

  // Handle image context (from area selection)
  useEffect(() => {
    if (imageContext) {
      setPendingImage(imageContext.imageData);
      setInput(`Analyse cette figure/image (page ${imageContext.page}) :`);
      onImageContextClear?.();
    }
  }, [imageContext, onImageContextClear]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentImage = pendingImage;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      imageData: currentImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          conversationId,
          message: userMessage.content,
          pages,
          highlightContext: highlightContext || undefined,
          imageData: currentImage || undefined,
        }),
      });

      // Clear highlight context after sending
      onHighlightContextClear?.();

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await response.json();

      // Update conversation ID
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message";
      setError(message);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Erreur: ${message}. Veuillez réessayer.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background min-h-0 overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center gap-3 py-4 text-muted-foreground">
              <MessageSquare className="h-5 w-5 opacity-50 flex-shrink-0" />
              <p className="text-sm">Posez une question sur ce paper.</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                citations={message.citations}
                imageData={message.imageData}
                onCitationClick={onCitationClick}
                onSaveCitation={onSaveCitation}
              />
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Réflexion en cours...</span>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={pendingImage}
              alt="Pending image"
              className="max-h-[80px] rounded border border-border"
            />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/80"
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingImage
                ? "Posez une question sur cette image..."
                : "Posez une question sur ce paper..."
            }
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
