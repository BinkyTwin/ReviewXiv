import { NextRequest, NextResponse } from "next/server";
import { validateCitations } from "@/lib/citations/validator";
import {
  buildPageContext,
  CITATION_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/citations/prompts";
import type { CitedResponse } from "@/types/citation";

interface CitationExtractionRequest {
  answerText: string;
  pages: Array<{ pageNumber: number; textContent: string }>;
  highlightContext?: {
    page: number;
    text: string;
  };
}

/**
 * POST /api/chat/citations
 * Extract citations for a given answer text.
 */
export async function POST(request: NextRequest) {
  try {
    const body: CitationExtractionRequest = await request.json();

    if (!body.answerText?.trim()) {
      return NextResponse.json(
        { error: "Answer text is required" },
        { status: 400 },
      );
    }

    // Build context from pages
    const context = buildPageContext(body.pages, body.highlightContext);

    // Limit context size (rough estimate: 4 chars per token, max ~8000 tokens for context)
    const maxContextLength = 32000;
    const truncatedContext =
      context.length > maxContextLength
        ? context.slice(0, maxContextLength) + "\n[...context truncated...]"
        : context;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const llmResponse = await fetch(new URL("/api/llm", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-3n-e4b-it:free",
        messages: [
          { role: "system", content: CITATION_EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `CONTEXTE DU PAPER:\n${truncatedContext}\n\nREPONSE A CITER:\n${body.answerText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(errorText || "Citation extraction failed");
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || "";

    let parsedResponse: CitedResponse;
    try {
      parsedResponse = JSON.parse(rawContent);
    } catch {
      const extractedJson = extractJsonFromMarkdown(rawContent);
      parsedResponse = JSON.parse(extractedJson);
    }

    const validatedCitations = validateCitations(
      parsedResponse.citations || [],
      body.pages,
    );

    return NextResponse.json({ citations: validatedCitations });
  } catch (error) {
    console.error("Citation extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Citation extraction failed",
      },
      { status: 500 },
    );
  }
}

/**
 * Extract JSON from markdown code blocks or return the content as-is
 */
function extractJsonFromMarkdown(content: string): string {
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const match = content.match(jsonBlockRegex);

  if (match) {
    return match[1].trim();
  }

  return content.trim();
}
