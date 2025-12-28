import { NextRequest, NextResponse } from "next/server";
import { extractPageData } from "@/lib/pdf/parser";
import * as pdfjsLib from "pdfjs-dist";
import type { PageData } from "@/types/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ExtractRequest {
  /** URL of the PDF to extract text from */
  pdfUrl: string;
  /** Optional: specific pages to extract (1-indexed) */
  pages?: number[];
}

interface ExtractResponse {
  pages: PageData[];
  totalPages: number;
}

/**
 * POST /api/pdf-text
 *
 * Extract text items with positions from a PDF document.
 * Returns TextItems for each page with normalized coordinates (0-1).
 *
 * Request body:
 * {
 *   pdfUrl: string;      // URL of the PDF
 *   pages?: number[];    // Optional: specific pages to extract
 * }
 *
 * Response:
 * {
 *   pages: PageData[];   // Array of page data with text items
 *   totalPages: number;  // Total number of pages in the PDF
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExtractRequest;
    const { pdfUrl, pages: requestedPages } = body;

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "Missing pdfUrl in request body" },
        { status: 400 },
      );
    }

    // Fetch the PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` },
        { status: 400 },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    }).promise;

    const totalPages = pdfDoc.numPages;

    // Determine which pages to extract
    const pagesToExtract = requestedPages?.length
      ? requestedPages.filter((p) => p >= 1 && p <= totalPages)
      : Array.from({ length: totalPages }, (_, i) => i + 1);

    // Extract text data from requested pages
    const pages: PageData[] = [];
    for (const pageNum of pagesToExtract) {
      const pageData = await extractPageData(pdfDoc, pageNum);
      pages.push(pageData);
    }

    await pdfDoc.destroy();

    const result: ExtractResponse = {
      pages,
      totalPages,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF extraction failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/pdf-text?url=...&page=...
 *
 * Quick endpoint to check if a PDF has extractable text on a specific page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get("url");
    const pageParam = searchParams.get("page");

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    // Fetch the PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` },
        { status: 400 },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    }).promise;

    const totalPages = pdfDoc.numPages;
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;

    if (pageNum < 1 || pageNum > totalPages) {
      await pdfDoc.destroy();
      return NextResponse.json(
        { error: `Invalid page number. PDF has ${totalPages} pages.` },
        { status: 400 },
      );
    }

    const pageData = await extractPageData(pdfDoc, pageNum);
    await pdfDoc.destroy();

    return NextResponse.json({
      pageNumber: pageNum,
      totalPages,
      hasText: pageData.hasText,
      textItemCount: pageData.textItems.length,
      width: pageData.width,
      height: pageData.height,
    });
  } catch (error) {
    console.error("PDF text check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF check failed",
      },
      { status: 500 },
    );
  }
}
