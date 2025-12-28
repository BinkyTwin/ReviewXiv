import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCitations } from "@/lib/citations/validator";
import {
  CITATION_SYSTEM_PROMPT,
  buildPageContext,
} from "@/lib/citations/prompts";
import type { CitedResponse } from "@/types/citation";

interface ChatRequest {
  paperId: string;
  conversationId?: string;
  message: string;
  pages: Array<{ pageNumber: number; textContent: string }>;
  highlightContext?: {
    page: number;
    text: string;
  };
  /** Base64 image data URL for vision analysis */
  imageData?: string;
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

    // Build context from pages
    const context = buildPageContext(body.pages, body.highlightContext);

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

    // Build user message content (with optional image for vision)
    let userMessageContent: MessageContent = body.message;

    if (body.imageData) {
      // Format for vision models
      userMessageContent = [
        { type: "text", text: body.message },
        { type: "image_url", image_url: { url: body.imageData } },
      ];
    }

    // Call LLM
    const llmResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/llm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: CITATION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `CONTEXTE DU PAPER:\n${truncatedContext}`,
            },
            ...messageHistory,
            { role: "user", content: userMessageContent },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          // Don't force JSON for vision requests as some models may not support it
          ...(body.imageData
            ? {}
            : { response_format: { type: "json_object" } }),
        }),
      },
    );

    if (!llmResponse.ok) {
      const error = await llmResponse.json();
      throw new Error(error.error || "LLM request failed");
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || "";

    // Parse LLM response
    // For vision requests, LLM may return JSON wrapped in markdown code blocks
    let parsedResponse: CitedResponse;
    try {
      // First try direct JSON parse
      parsedResponse = JSON.parse(rawContent);
    } catch {
      // If direct parse fails, try extracting from markdown code blocks
      try {
        const extractedJson = extractJsonFromMarkdown(rawContent);
        parsedResponse = JSON.parse(extractedJson);
      } catch {
        // Final fallback if all parsing fails
        parsedResponse = {
          answer: rawContent,
          citations: [],
        };
      }
    }

    // Validate citations
    const validatedCitations = validateCitations(
      parsedResponse.citations || [],
      body.pages,
    );

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

    // Save messages to database
    if (conversationId) {
      // Save user message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: body.message,
      });

      // Save assistant message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: JSON.stringify(parsedResponse),
        citations: validatedCitations,
        model_used: process.env.OPENROUTER_MODEL || "openrouter",
      });
    }

    return NextResponse.json({
      conversationId,
      content: parsedResponse.answer,
      citations: validatedCitations,
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
function extractJsonFromMarkdown(content: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const match = content.match(jsonBlockRegex);

  if (match) {
    return match[1].trim();
  }

  // If no code block found, return trimmed content
  return content.trim();
}
