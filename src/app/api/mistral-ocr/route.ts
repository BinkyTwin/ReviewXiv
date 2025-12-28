import { NextRequest, NextResponse } from "next/server";
import {
  processDocument,
  isMistralConfigured,
  getMistralConfig,
} from "@/lib/mistral-ocr";

export const maxDuration = 120; // Allow up to 2 minutes for PDF processing

/**
 * GET /api/mistral-ocr
 * Check if Mistral OCR is configured and return status
 */
export async function GET() {
  const config = getMistralConfig();

  return NextResponse.json({
    available: config.configured,
    provider: "mistral",
    model: config.model,
  });
}

/**
 * POST /api/mistral-ocr
 * Process a document using Mistral OCR
 *
 * Body: {
 *  documentUrl: string,
 *  includeImages?: boolean,
 *  pages?: string,
 *  outputFormat?: "markdown" | "html"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Mistral is configured
    if (!isMistralConfigured()) {
      return NextResponse.json(
        {
          error:
            "Mistral OCR not configured. Add MISTRAL_OCR_API_KEY to .env.local",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      documentUrl,
      includeImages = true,
      pages,
      outputFormat = "html",
    } = body;
    const normalizedOutputFormat =
      outputFormat === "markdown" ? "markdown" : "html";

    if (!documentUrl) {
      return NextResponse.json(
        { error: "documentUrl is required" },
        { status: 400 },
      );
    }

    // Process document with Mistral OCR
    const result = await processDocument(documentUrl, {
      includeImages,
      tableFormat: normalizedOutputFormat,
      outputFormat: normalizedOutputFormat,
      pages,
    });

    return NextResponse.json({
      success: true,
      pages: result.pages,
      model: result.model,
      pagesProcessed: result.usage_info.pages_processed,
    });
  } catch (error) {
    console.error("Mistral OCR error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Mistral OCR processing failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
