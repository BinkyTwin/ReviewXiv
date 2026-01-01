import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

/**
 * POST /api/llm
 * Unified LLM endpoint that routes to OpenRouter or LM Studio
 */
export async function POST(request: NextRequest) {
  try {
    const body: LLMRequest = await request.json();
    const supabase = await createClient();

    // Get settings from database
    const { data: settings } = await supabase
      .from("settings")
      .select("llm_provider, lmstudio_url, openrouter_model")
      .single();

    const provider = settings?.llm_provider || "openrouter";

    let apiUrl: string;
    let headers: Record<string, string>;
    let requestBody: Record<string, unknown>;

    if (provider === "lmstudio") {
      // LM Studio (local)
      const baseUrl = settings?.lmstudio_url || "http://localhost:1234/v1";
      apiUrl = `${baseUrl}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
      };
      requestBody = {
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2048,
        response_format: body.response_format,
      };
    } else {
      // OpenRouter (default)
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
        body.model ||
        process.env.OPENROUTER_MODEL ||
        settings?.openrouter_model ||
        "nvidia/nemotron-nano-12b-v2-vl:free";

      requestBody = {
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2048,
        response_format: body.response_format,
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API error:", errorText);
      return NextResponse.json(
        { error: `LLM API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("LLM error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LLM request failed" },
      { status: 500 },
    );
  }
}
