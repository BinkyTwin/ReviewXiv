import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { HighlightRect } from "@/types/highlight";

interface CreateTranslationRequest {
  paperId: string;
  pageNumber?: number;
  format?: "pdf" | "html";
  sectionId?: string;
  sourceText: string;
  sourceLanguage?: string;
  targetLanguage: string;
  translatedText: string;
  startOffset: number;
  endOffset: number;
  rects: HighlightRect[];
  isActive?: boolean;
}

// GET /api/translations?paperId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paperId = searchParams.get("paperId");

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: translations, error } = await supabase
      .from("inline_translations")
      .select("*")
      .eq("paper_id", paperId)
      .order("page_number", { ascending: true })
      .order("start_offset", { ascending: true });

    if (error) {
      console.error("Error fetching translations:", error);
      return NextResponse.json(
        { error: "Failed to fetch translations" },
        { status: 500 },
      );
    }

    // Transform snake_case to camelCase
    const transformedTranslations = translations.map((t) => ({
      id: t.id,
      paperId: t.paper_id,
      format: t.format || "pdf",
      pageNumber: t.page_number,
      sectionId: t.section_id || undefined,
      sourceText: t.source_text,
      sourceLanguage: t.source_language,
      targetLanguage: t.target_language,
      translatedText: t.translated_text,
      startOffset: t.start_offset,
      endOffset: t.end_offset,
      rects: t.rects,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json({ translations: transformedTranslations });
  } catch (error) {
    console.error("Error in GET /api/translations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/translations
export async function POST(request: NextRequest) {
  try {
    const body: CreateTranslationRequest = await request.json();

    const {
      paperId,
      pageNumber,
      format,
      sectionId,
      sourceText,
      sourceLanguage,
      targetLanguage,
      translatedText,
      startOffset,
      endOffset,
      rects,
      isActive = true,
    } = body;

    if (
      !paperId ||
      !sourceText ||
      !targetLanguage ||
      !translatedText ||
      startOffset === undefined ||
      endOffset === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const translationFormat = format ?? "pdf";
    let resolvedPageNumber = pageNumber;

    if (translationFormat === "html") {
      if (!sectionId) {
        return NextResponse.json(
          { error: "sectionId is required for HTML translations" },
          { status: 400 },
        );
      }

      if (resolvedPageNumber === undefined) {
        const { data: sectionRow, error: sectionError } = await supabase
          .from("paper_sections")
          .select("section_index")
          .eq("paper_id", paperId)
          .eq("section_id", sectionId)
          .maybeSingle();

        if (sectionError || !sectionRow) {
          return NextResponse.json(
            { error: "Invalid sectionId" },
            { status: 400 },
          );
        }

        resolvedPageNumber = sectionRow.section_index + 1;
      }
    } else if (resolvedPageNumber === undefined) {
      return NextResponse.json(
        { error: "pageNumber is required for PDF translations" },
        { status: 400 },
      );
    }

    const { data: translation, error } = await supabase
      .from("inline_translations")
      .insert({
        paper_id: paperId,
        page_number: resolvedPageNumber,
        source_text: sourceText,
        source_language: sourceLanguage || null,
        target_language: targetLanguage,
        translated_text: translatedText,
        start_offset: startOffset,
        end_offset: endOffset,
        rects: rects || [],
        is_active: isActive,
        format: translationFormat,
        section_id: translationFormat === "html" ? sectionId : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating translation:", error);
      return NextResponse.json(
        { error: "Failed to create translation" },
        { status: 500 },
      );
    }

    // Transform to camelCase
    const transformedTranslation = {
      id: translation.id,
      paperId: translation.paper_id,
      format: translation.format || "pdf",
      pageNumber: translation.page_number,
      sectionId: translation.section_id || undefined,
      sourceText: translation.source_text,
      sourceLanguage: translation.source_language,
      targetLanguage: translation.target_language,
      translatedText: translation.translated_text,
      startOffset: translation.start_offset,
      endOffset: translation.end_offset,
      rects: translation.rects,
      isActive: translation.is_active,
      createdAt: translation.created_at,
      updatedAt: translation.updated_at,
    };

    return NextResponse.json(
      { translation: transformedTranslation },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/translations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/translations?id=xxx (toggle isActive or update)
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const { isActive } = body;

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data: translation, error } = await supabase
      .from("inline_translations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating translation:", error);
      return NextResponse.json(
        { error: "Failed to update translation" },
        { status: 500 },
      );
    }

    const transformedTranslation = {
      id: translation.id,
      paperId: translation.paper_id,
      format: translation.format || "pdf",
      pageNumber: translation.page_number,
      sectionId: translation.section_id || undefined,
      sourceText: translation.source_text,
      sourceLanguage: translation.source_language,
      targetLanguage: translation.target_language,
      translatedText: translation.translated_text,
      startOffset: translation.start_offset,
      endOffset: translation.end_offset,
      rects: translation.rects,
      isActive: translation.is_active,
      createdAt: translation.created_at,
      updatedAt: translation.updated_at,
    };

    return NextResponse.json({ translation: transformedTranslation });
  } catch (error) {
    console.error("Error in PUT /api/translations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/translations?id=xxx OR /api/translations?paperId=xxx&all=true
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const paperId = searchParams.get("paperId");
    const deleteAll = searchParams.get("all") === "true";

    const supabase = await createClient();

    // Delete all translations for a paper
    if (deleteAll && paperId) {
      const { error } = await supabase
        .from("inline_translations")
        .delete()
        .eq("paper_id", paperId);

      if (error) {
        console.error("Error deleting all translations:", error);
        return NextResponse.json(
          { error: "Failed to delete translations" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, deletedAll: true });
    }

    // Delete single translation
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("inline_translations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting translation:", error);
      return NextResponse.json(
        { error: "Failed to delete translation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/translations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
