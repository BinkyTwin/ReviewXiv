import { NextRequest, NextResponse } from "next/server";
import { fetchArxivHtml } from "@/lib/arxiv/fetcher";

export const runtime = "nodejs";

// GET /api/arxiv/fetch?id=xxxx or ?url=https://arxiv.org/abs/xxxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const url = searchParams.get("url");
    const input = id || url;

    if (!input) {
      return NextResponse.json(
        { error: "id or url is required" },
        { status: 400 },
      );
    }

    const result = await fetchArxivHtml(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error("arXiv fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch arXiv HTML",
      },
      { status: 500 },
    );
  }
}
