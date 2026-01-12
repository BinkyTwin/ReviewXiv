import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { fetchArxivHtmlById } from "@/lib/arxiv/fetcher";
import { parseArxivHtml } from "@/lib/arxiv/parser";
import { extractArxivId } from "@/lib/arxiv/utils";
import { sanitizeTextForDb } from "@/lib/text/sanitize";
import { chunkSectionContent } from "@/lib/content/parser";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ImportArxivRequest {
  url?: string;
  arxivId?: string;
}

// POST /api/papers/import-arxiv
export async function POST(request: NextRequest) {
  let paperId: string | null = null;

  try {
    const body: ImportArxivRequest = await request.json();
    const input = body.arxivId || body.url;

    if (!input) {
      return NextResponse.json(
        { error: "url or arxivId is required" },
        { status: 400 },
      );
    }

    const arxivId = extractArxivId(input);
    if (!arxivId) {
      return NextResponse.json(
        { error: "Invalid arXiv URL or ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: existingPaper } = await supabase
      .from("papers")
      .select("id, status")
      .eq("arxiv_id", arxivId)
      .eq("format", "html")
      .maybeSingle();

    if (existingPaper) {
      return NextResponse.json({
        paperId: existingPaper.id,
        status: existingPaper.status,
        existing: true,
      });
    }

    const fetched = await fetchArxivHtmlById(arxivId);
    const parsed = parseArxivHtml(fetched.html, arxivId);

    const title = parsed.metadata.title || `arXiv ${arxivId}`;
    const authors =
      parsed.metadata.authors.length > 0 ? parsed.metadata.authors : null;
    const abstract = parsed.metadata.abstract || null;

    const storagePath = `arxiv-html/${arxivId}.html`;
    const { data: paper, error: insertError } = await supabase
      .from("papers")
      .insert({
        title,
        authors,
        abstract,
        arxiv_id: arxivId,
        source_url: fetched.sourceUrl,
        storage_path: storagePath,
        status: "processing",
        format: "html",
        html_cached: true,
      })
      .select("id")
      .single();

    if (insertError || !paper) {
      console.error("Paper insert error:", insertError);
      throw new Error("Failed to create paper record");
    }

    paperId = paper.id;

    const htmlHash = crypto
      .createHash("sha256")
      .update(fetched.html)
      .digest("hex");

    const { error: cacheError } = await supabase
      .from("paper_html_cache")
      .insert({
        paper_id: paper.id,
        arxiv_id: arxivId,
        raw_html: fetched.html,
        source_url: fetched.sourceUrl,
        html_hash: htmlHash,
      });

    if (cacheError) {
      console.error("HTML cache insert error:", cacheError);
    }

    let totalChunks = 0;
    const sections = parsed.sections;

    for (const section of sections) {
      const textContent = sanitizeTextForDb(section.textContent);
      const htmlContent = section.htmlContent || null;

      const { data: sectionRow, error: sectionError } = await supabase
        .from("paper_sections")
        .insert({
          paper_id: paper.id,
          section_index: section.sectionIndex,
          section_id: section.sectionId,
          title: section.title,
          level: section.level,
          text_content: textContent,
          html_content: htmlContent,
        })
        .select("id")
        .single();

      if (sectionError || !sectionRow) {
        console.error("Section insert error:", sectionError);
        continue;
      }

      const { data: pageRow, error: pageError } = await supabase
        .from("paper_pages")
        .insert({
          paper_id: paper.id,
          page_number: section.sectionIndex + 1,
          text_content: textContent,
          text_items: [],
          width: null,
          height: null,
          has_text: true,
        })
        .select("id")
        .single();

      if (pageError || !pageRow) {
        console.error("Section page insert error:", pageError);
        continue;
      }

      const chunks = chunkSectionContent(textContent);
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const { error: chunkError } = await supabase.from("chunks").insert({
          paper_id: paper.id,
          page_id: pageRow.id,
          page_number: section.sectionIndex + 1,
          chunk_index: i,
          content: sanitizeTextForDb(chunk.content),
          start_offset: chunk.startOffset,
          end_offset: chunk.endOffset,
          section_id: section.sectionId,
          chunk_strategy: "section",
        });

        if (!chunkError) {
          totalChunks += 1;
        }
      }
    }

    await supabase
      .from("papers")
      .update({
        status: "ready",
        page_count: sections.length,
        embedding_status: "pending",
        total_chunks: totalChunks,
        embedded_chunks: 0,
      })
      .eq("id", paper.id);

    return NextResponse.json({
      paperId: paper.id,
      sectionCount: sections.length,
      status: "ready",
      embeddingStatus: "pending",
    });
  } catch (error) {
    console.error("arXiv import error:", error);

    if (paperId) {
      try {
        const supabase = await createClient();
        await supabase.from("papers").delete().eq("id", paperId);
      } catch (cleanupError) {
        console.error("Failed to cleanup paper:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import arXiv HTML",
      },
      { status: 500 },
    );
  }
}
