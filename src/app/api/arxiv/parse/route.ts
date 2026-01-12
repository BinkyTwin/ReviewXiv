import { NextRequest, NextResponse } from "next/server";
import { parseArxivHtml } from "@/lib/arxiv/parser";

export const runtime = "nodejs";

interface ParseRequest {
  html?: string;
  arxivId?: string;
}

// POST /api/arxiv/parse
export async function POST(request: NextRequest) {
  try {
    const body: ParseRequest = await request.json();

    if (!body.html) {
      return NextResponse.json(
        { error: "html is required" },
        { status: 400 },
      );
    }

    const parsed = parseArxivHtml(body.html, body.arxivId || "unknown");
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("arXiv parse error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse arXiv HTML",
      },
      { status: 500 },
    );
  }
}
