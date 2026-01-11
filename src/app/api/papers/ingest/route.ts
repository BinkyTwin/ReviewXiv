import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractAllPages, chunkPageContent } from "@/lib/pdf/parser";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/pdf/constants";
import crypto from "crypto";

/**
 * Sanitize text for PostgreSQL - remove null characters and other problematic Unicode
 */
function sanitizeTextForDb(text: string | null | undefined): string {
  if (!text) return "";
  // Remove null characters (\u0000) which PostgreSQL cannot store in text fields
  // Also remove other control characters that might cause issues
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/papers/ingest
 * Upload and process a PDF file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const arxivUrl = formData.get("arxivUrl") as string | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_PDF_SIZE_LABEL}.` },
        { status: 413 },
      );
    }

    const supabase = await createClient();
    const buffer = await file.arrayBuffer();

    // Calculate file hash for deduplication
    const fileHash = crypto
      .createHash("sha256")
      .update(Buffer.from(buffer))
      .digest("hex");

    // Clean up any previous failed upload with same hash
    const { data: failedPapers } = await supabase
      .from("papers")
      .select("id, storage_path")
      .eq("file_hash", fileHash)
      .eq("status", "error");

    if (failedPapers && failedPapers.length > 0) {
      for (const failed of failedPapers) {
        await supabase.storage.from("papers").remove([failed.storage_path]);
        await supabase.from("papers").delete().eq("id", failed.id);
      }
    }

    // Upload to Supabase Storage
    const storagePath = `${fileHash}-${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      const uploadStatus = getStorageStatus(uploadError);
      const uploadMessage = getStorageMessage(uploadError);

      throw new Error(
        `Failed to upload PDF to storage: ${uploadMessage}${
          uploadStatus ? ` (status ${uploadStatus})` : ""
        }`,
      );
    }

    // Extract title from filename
    const title = file.name.replace(/\.pdf$/i, "");

    // Extract arXiv ID if URL provided
    const arxivId = arxivUrl ? extractArxivId(arxivUrl) : null;

    // Create paper entry
    const { data: paper, error: insertError } = await supabase
      .from("papers")
      .insert({
        title,
        storage_path: storagePath,
        file_hash: fileHash,
        arxiv_id: arxivId,
        source_url: arxivUrl || null,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Paper insert error:", insertError);
      // Clean up uploaded file
      await supabase.storage.from("papers").remove([storagePath]);
      throw new Error("Failed to create paper record");
    }

    // Extract pages from PDF
    let pages;
    try {
      pages = await extractAllPages(buffer);
    } catch (extractError) {
      console.error("PDF extraction error:", extractError);
      // Clean up: remove storage file and DB record on extraction failure
      await supabase.storage.from("papers").remove([storagePath]);
      await supabase.from("papers").delete().eq("id", paper.id);
      const extractMessage =
        extractError instanceof Error ? extractError.message : "Unknown error";
      throw new Error(`Failed to extract text from PDF: ${extractMessage}`);
    }

    // Insert pages
    for (const page of pages) {
      // Sanitize text content to remove null characters that PostgreSQL can't handle
      const sanitizedTextContent = sanitizeTextForDb(page.textContent);

      const { data: pageData, error: pageError } = await supabase
        .from("paper_pages")
        .insert({
          paper_id: paper.id,
          page_number: page.pageNumber,
          text_content: sanitizedTextContent,
          text_items: page.textItems,
          width: page.width,
          height: page.height,
          has_text: page.hasText,
        })
        .select("id")
        .single();

      if (pageError) {
        console.error("Page insert error:", pageError);
        continue;
      }

      // Create chunks for this page (using sanitized content)
      const chunks = chunkPageContent(sanitizedTextContent);
      for (let i = 0; i < chunks.length; i++) {
        await supabase.from("chunks").insert({
          paper_id: paper.id,
          page_id: pageData.id,
          page_number: page.pageNumber,
          chunk_index: i,
          content: sanitizeTextForDb(chunks[i].content),
          start_offset: chunks[i].startOffset,
          end_offset: chunks[i].endOffset,
        });
      }
    }

    // Determine final status
    const hasOcrNeeded = pages.some((p) => !p.hasText);
    const finalStatus = hasOcrNeeded ? "ocr_needed" : "ready";

    // Count total chunks for embedding status
    const { count: totalChunks } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("paper_id", paper.id);

    // Update paper with final status and chunk count
    await supabase
      .from("papers")
      .update({
        status: finalStatus,
        page_count: pages.length,
        embedding_status: "pending",
        total_chunks: totalChunks || 0,
        embedded_chunks: 0,
      })
      .eq("id", paper.id);



    return NextResponse.json({
      paperId: paper.id,
      pageCount: pages.length,
      status: finalStatus,
      embeddingStatus: "pending",
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process PDF",
      },
      { status: 500 },
    );
  }
}

/**
 * Extract arXiv ID from URL
 * Handles formats like:
 * - https://arxiv.org/abs/2301.00001
 * - https://arxiv.org/pdf/2301.00001.pdf
 */
function extractArxivId(url: string): string | null {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

function getStorageStatus(error: unknown): number | null {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return typeof statusCode === "number" ? statusCode : null;
  }
  return null;
}

function getStorageMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return "Unknown storage error";
}
