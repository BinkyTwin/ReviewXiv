import { NextRequest, NextResponse } from "next/server";

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  zh: "Chinese",
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  ar: "Arabic",
};

/**
 * POST /api/translate
 * Translate text using LLM
 */
export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, targetLanguage, sourceLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Text and target language are required" },
        { status: 400 },
      );
    }

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage
      ? LANGUAGE_NAMES[sourceLanguage] || sourceLanguage
      : "auto-detected";

    const systemPrompt = `You are a professional translator. Translate the given text accurately while preserving the meaning, tone, and technical terminology.
Output ONLY the translated text, nothing else. No explanations, no quotes around the translation.`;

    const userPrompt = `Translate the following text from ${sourceLangName} to ${targetLangName}:

${text}`;

    // Call LLM
    const llmResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/llm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      },
    );

    if (!llmResponse.ok) {
      const error = await llmResponse.json();
      throw new Error(error.error || "Translation request failed");
    }

    const llmData = await llmResponse.json();
    const translation = llmData.choices?.[0]?.message?.content?.trim() || "";

    if (!translation) {
      throw new Error("Empty translation response");
    }

    return NextResponse.json({
      original: text,
      translation,
      sourceLanguage: sourceLanguage || "auto",
      targetLanguage,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 },
    );
  }
}
