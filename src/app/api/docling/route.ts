import { NextRequest, NextResponse } from "next/server";
import { checkDoclingAvailable, convertPDF } from "@/lib/docling/client";
import { parseDoclingDocument } from "@/lib/docling/parser";
import type { PageLayout } from "@/lib/ocr/types";

export const maxDuration = 120; // Allow up to 2 minutes for PDF processing

const DOCLING_URL = process.env.DOCLING_URL || "http://localhost:5001";

/**
 * GET /api/docling
 * Check if docling-serve is available and return status
 */
export async function GET() {
  const available = await checkDoclingAvailable();

  return NextResponse.json({
    available,
    provider: "docling",
    url: DOCLING_URL,
  });
}

/**
 * POST /api/docling
 * Convert a PDF file using Docling and return parsed layouts
 *
 * Accepts:
 * - multipart/form-data with 'file' field (PDF file)
 * - OR JSON body with 'pdfUrl' field (URL to PDF)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if docling is available
    const available = await checkDoclingAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error:
            "Docling service not available. Please start docling-serve on port 5001.",
          hint: "Run: pip install 'docling-serve[ui]' && docling-serve run --port 5001",
        },
        { status: 503 },
      );
    }

    let pdfBuffer: ArrayBuffer;
    let filename = "document.pdf";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      pdfBuffer = await file.arrayBuffer();
      filename = file.name;
    } else if (contentType.includes("application/json")) {
      // Handle URL-based conversion
      const body = await request.json();
      const { pdfUrl } = body;

      if (!pdfUrl) {
        return NextResponse.json(
          { error: "No pdfUrl provided" },
          { status: 400 },
        );
      }

      // Fetch the PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${response.status}` },
          { status: 400 },
        );
      }

      pdfBuffer = await response.arrayBuffer();
      filename = pdfUrl.split("/").pop() || "document.pdf";
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid content type. Use multipart/form-data or application/json",
        },
        { status: 400 },
      );
    }

    // Convert PDF using Docling
    const doclingDoc = await convertPDF(pdfBuffer, filename);

    // Parse into PageLayout structures
    const layoutsMap = parseDoclingDocument(doclingDoc);

    // Convert Map to serializable object
    const layouts: Record<number, PageLayout> = {};
    layoutsMap.forEach((layout, pageNum) => {
      layouts[pageNum] = layout;
    });

    // Get total page count
    const totalPages = Object.keys(layouts).length;

    return NextResponse.json({
      success: true,
      totalPages,
      layouts,
      // Include raw document for advanced use cases
      rawDocument: doclingDoc,
    });
  } catch (error) {
    console.error("Docling processing error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Docling processing failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
