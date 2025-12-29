"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ArrowUp, Loader2, MessageSquare, Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/citation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  /** Base64 image data URL for user messages with images */
  imageData?: string;
}

interface ChatResponse {
  error?: string;
  content?: string;
  citations?: Citation[];
  conversationId?: string;
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

      const responseText = await response.text();
      let data: ChatResponse;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            (responseText
              ? `Failed to send message: ${responseText}`
              : "Failed to send message"),
        );
      }

      if (!data.content) {
        throw new Error(
          responseText
            ? `Invalid chat response: ${responseText}`
            : "Invalid chat response",
        );
      }

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
    <div className="flex flex-col h-full w-full bg-background min-h-0 overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between apple-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Assistant de Recherche</h2>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Analyse...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 min-h-0">
        <div className="py-8 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in">
              <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4 apple-shadow">
                <Bot className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-medium mb-1">Comment puis-je vous aider ?</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Posez n'importe quelle question sur ce document scientifique.
              </p>
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

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in">
              {error}
            </div>
          )}

          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-6 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="relative group apple-shadow apple-blur rounded-[24px] border border-border/50 focus-within:border-primary/30 transition-all duration-300">
          {/* Pending image preview */}
          {pendingImage && (
            <div className="px-4 pt-4 relative animate-in">
              <div className="relative inline-block group/img">
                <img
                  src={pendingImage}
                  alt="Pending"
                  className="max-h-[100px] rounded-xl border border-border/50 apple-shadow object-contain"
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:scale-110 transition-transform"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-end gap-2 p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingImage
                  ? "Que voulez-vous savoir sur cette image ?"
                  : "Posez une question..."
              }
              className="min-h-[48px] max-h-[160px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm py-3 px-3 scrollbar-none"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                "h-10 w-10 shrink-0 rounded-2xl transition-all duration-300 apple-shadow",
                input.trim() ? "bg-primary scale-100" : "bg-muted scale-95 opacity-50"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-medium opacity-50">
          DeepRead AI Assistant
        </p>
      </div>
    </div>
  );
}
