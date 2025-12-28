import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractAllPages, chunkPageContent } from "@/lib/pdf/parser";
import crypto from "crypto";

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

    const supabase = await createClient();
    const buffer = await file.arrayBuffer();

    // Calculate file hash for deduplication
    const fileHash = crypto
      .createHash("sha256")
      .update(Buffer.from(buffer))
      .digest("hex");

    // Check for existing paper with same hash
    const { data: existing } = await supabase
      .from("papers")
      .select("id")
      .eq("file_hash", fileHash)
      .single();

    if (existing) {
      return NextResponse.json({
        paperId: existing.id,
        duplicate: true,
      });
    }

    // Upload to Supabase Storage
    const storagePath = `${fileHash}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload PDF to storage");
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
      await supabase
        .from("papers")
        .update({
          status: "error",
          processing_error: "Failed to extract text from PDF",
        })
        .eq("id", paper.id);
      throw new Error("Failed to extract text from PDF");
    }

    // Insert pages
    for (const page of pages) {
      const { data: pageData, error: pageError } = await supabase
        .from("paper_pages")
        .insert({
          paper_id: paper.id,
          page_number: page.pageNumber,
          text_content: page.textContent,
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

      // Create chunks for this page
      const chunks = chunkPageContent(page.textContent);
      for (let i = 0; i < chunks.length; i++) {
        await supabase.from("chunks").insert({
          paper_id: paper.id,
          page_id: pageData.id,
          page_number: page.pageNumber,
          chunk_index: i,
          content: chunks[i].content,
          start_offset: chunks[i].startOffset,
          end_offset: chunks[i].endOffset,
        });
      }
    }

    // Determine final status
    const hasOcrNeeded = pages.some((p) => !p.hasText);
    const finalStatus = hasOcrNeeded ? "ocr_needed" : "ready";

    // Update paper with final status
    await supabase
      .from("papers")
      .update({
        status: finalStatus,
        page_count: pages.length,
      })
      .eq("id", paper.id);

    return NextResponse.json({
      paperId: paper.id,
      pageCount: pages.length,
      status: finalStatus,
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
