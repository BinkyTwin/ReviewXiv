import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPageContext, CHAT_SYSTEM_PROMPT } from "@/lib/citations/prompts";
import {
  buildChunkContext,
  summarizeRetrievedChunks,
} from "@/lib/rag/context-builder";
import type { ContextChunk, RetrievalOptions } from "@/types/rag";

interface ChatRequest {
  paperId: string;
  conversationId?: string;
  message: string;
  /** Pages for legacy mode (when RAG is disabled) */
  pages?: Array<{ pageNumber: number; textContent: string }>;
  highlightContext?: {
    page: number;
    text: string;
  };
  /** Base64 image data URL for vision analysis */
  imageData?: string;
  /** Use RAG-based retrieval (default: true) */
  useRag?: boolean;
  /** RAG retrieval options */
  ragOptions?: RetrievalOptions;
}

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

/**
 * POST /api/chat
 * Chat with a paper, returning citations
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const supabase = await createClient();

    // Determine if RAG should be used (default: true)
    const useRag = body.useRag !== false;
    let context: string;
    let ragInfo = "";

    if (useRag) {
      // Use RAG-based retrieval for focused context
      try {
        const searchResponse = await fetch(
          new URL("/api/search/chunks", request.url),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paperId: body.paperId,
              query: body.message,
              options: {
                topK: body.ragOptions?.topK || 8,
                useHybrid: body.ragOptions?.useHybrid !== false,
                useMmr: body.ragOptions?.useMmr !== false,
                useReranking: body.ragOptions?.useReranking !== false,
                mmrLambda: body.ragOptions?.mmrLambda || 0.7,
              },
            }),
          },
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error("RAG search failed:", errorText);
          throw new Error("RAG search failed");
        }

        const { chunks, searchTime, method } =
          (await searchResponse.json()) as {
            chunks: ContextChunk[];
            searchTime: number;
            method: string;
          };

        // Build context from retrieved chunks
        context = buildChunkContext(chunks, body.highlightContext);
        ragInfo = `[RAG: ${summarizeRetrievedChunks(chunks)} in ${searchTime}ms via ${method}]`;
        console.log(ragInfo);
      } catch (ragError) {
        console.error("RAG failed, falling back to pages:", ragError);
        // Fallback to legacy page-based context if RAG fails
        if (body.pages && body.pages.length > 0) {
          context = buildPageContext(body.pages, body.highlightContext);
          ragInfo = "[RAG: fallback to pages]";
        } else {
          throw new Error(
            "RAG search failed and no pages provided for fallback",
          );
        }
      }
    } else if (body.pages && body.pages.length > 0) {
      // Legacy mode: use provided pages
      context = buildPageContext(body.pages, body.highlightContext);
      ragInfo = "[RAG: disabled, using pages]";
    } else {
      return NextResponse.json(
        { error: "Either RAG must be enabled or pages must be provided" },
        { status: 400 },
      );
    }

    // Limit context size (rough estimate: 4 chars per token, max ~8000 tokens for context)
    const maxContextLength = 32000;
    const truncatedContext =
      context.length > maxContextLength
        ? context.slice(0, maxContextLength) + "\n[...context truncated...]"
        : context;

    // Get conversation history if exists
    let messageHistory: Array<{ role: string; content: string }> = [];

    if (body.conversationId) {
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", body.conversationId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (history) {
        messageHistory = history.map((m) => ({
          role: m.role,
          content:
            m.role === "assistant"
              ? extractAnswerFromContent(m.content)
              : m.content,
        }));
      }
    }

    // Create or get conversation
    let conversationId = body.conversationId;

    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          paper_id: body.paperId,
          title: body.message.slice(0, 100),
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Conversation creation error:", convError);
      } else {
        conversationId = newConv.id;
      }
    }

    // Save user message to database
    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: body.message,
      });
    }

    // Build user message content (with optional image for vision)
    let userMessageContent: MessageContent = body.message;

    if (body.imageData) {
      // Format for vision models
      userMessageContent = [
        { type: "text", text: body.message },
        { type: "image_url", image_url: { url: body.imageData } },
      ];
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("llm_provider, lmstudio_url, openrouter_model")
      .single();

    const provider = settings?.llm_provider || "openrouter";

    let apiUrl: string;
    let headers: Record<string, string>;
    let requestBody: Record<string, unknown>;
    let modelUsed = provider;

    if (provider === "lmstudio") {
      const baseUrl = settings?.lmstudio_url || "http://localhost:1234/v1";
      apiUrl = `${baseUrl}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
      };
      requestBody = {
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `CONTEXTE DU PAPER:\n${truncatedContext}`,
          },
          ...messageHistory,
          { role: "user", content: userMessageContent },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      };
    } else {
      const apiKey = process.env.OPENROUTER_API;

      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenRouter API key not configured" },
          { status: 500 },
        );
      }

      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "ReviewXiv",
      };

      const model =
        process.env.OPENROUTER_MODEL ||
        settings?.openrouter_model ||
        "nvidia/nemotron-nano-12b-v2-vl:free";
      modelUsed = model;

      requestBody = {
        model,
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `CONTEXTE DU PAPER:\n${truncatedContext}`,
          },
          ...messageHistory,
          { role: "user", content: userMessageContent },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      };
    }

    const llmResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(errorText || "LLM request failed");
    }

    if (!llmResponse.body) {
      throw new Error("LLM response missing stream body");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body!.getReader();
        let buffer = "";
        let isClosed = false;

        const closeStream = () => {
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        };

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;

              const data = trimmed.replace(/^data:\s*/, "");
              if (data === "[DONE]") {
                closeStream();
                break;
              }

              try {
                const parsed = JSON.parse(data);
                const delta =
                  parsed.choices?.[0]?.delta?.content ??
                  parsed.choices?.[0]?.message?.content ??
                  "";
                if (delta) {
                  fullText += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch (parseError) {
                console.error("Streaming parse error:", parseError);
              }
            }
          }
        } finally {
          closeStream();
          if (conversationId) {
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: fullText.trim(),
              model_used: modelUsed,
            });
          }
        }
      },
    });

    const responseHeaders = new Headers({
      "Content-Type": "text/plain; charset=utf-8",
    });

    if (conversationId) {
      responseHeaders.set("x-conversation-id", conversationId);
    }

    return new NextResponse(stream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}

/**
 * Extract answer text from stored content (which may be JSON)
 */
function extractAnswerFromContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return parsed.answer || content;
  } catch {
    return content;
  }
}

/**
 * Extract JSON from markdown code blocks or return the content as-is
 * Handles responses like: ```json\n{...}\n``` or ```\n{...}\n```
 */
