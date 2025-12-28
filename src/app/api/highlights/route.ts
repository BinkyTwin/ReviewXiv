import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateHighlightRequest } from "@/types/highlight";

// GET /api/highlights?paperId=xxx
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

    const { data: highlights, error } = await supabase
      .from("highlights")
      .select("*")
      .eq("paper_id", paperId)
      .order("page_number", { ascending: true })
      .order("start_offset", { ascending: true });

    if (error) {
      console.error("Error fetching highlights:", error);
      return NextResponse.json(
        { error: "Failed to fetch highlights" },
        { status: 500 },
      );
    }

    // Transform snake_case to camelCase
    const transformedHighlights = highlights.map((h) => ({
      id: h.id,
      paperId: h.paper_id,
      pageNumber: h.page_number,
      startOffset: h.start_offset,
      endOffset: h.end_offset,
      selectedText: h.selected_text,
      rects: h.rects,
      color: h.color,
      note: h.note,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
    }));

    return NextResponse.json({ highlights: transformedHighlights });
  } catch (error) {
    console.error("Error in GET /api/highlights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/highlights
export async function POST(request: NextRequest) {
  try {
    const body: CreateHighlightRequest = await request.json();

    const {
      paperId,
      pageNumber,
      startOffset,
      endOffset,
      selectedText,
      rects,
      color,
    } = body;

    if (
      !paperId ||
      !pageNumber ||
      startOffset === undefined ||
      endOffset === undefined ||
      !selectedText
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: highlight, error } = await supabase
      .from("highlights")
      .insert({
        paper_id: paperId,
        page_number: pageNumber,
        start_offset: startOffset,
        end_offset: endOffset,
        selected_text: selectedText,
        rects: rects || [],
        color: color || "yellow",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating highlight:", error);
      return NextResponse.json(
        { error: "Failed to create highlight" },
        { status: 500 },
      );
    }

    // Transform to camelCase
    const transformedHighlight = {
      id: highlight.id,
      paperId: highlight.paper_id,
      pageNumber: highlight.page_number,
      startOffset: highlight.start_offset,
      endOffset: highlight.end_offset,
      selectedText: highlight.selected_text,
      rects: highlight.rects,
      color: highlight.color,
      note: highlight.note,
      createdAt: highlight.created_at,
      updatedAt: highlight.updated_at,
    };

    return NextResponse.json(
      { highlight: transformedHighlight },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/highlights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/highlights?id=xxx OR /api/highlights?paperId=xxx&all=true
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const paperId = searchParams.get("paperId");
    const deleteAll = searchParams.get("all") === "true";

    const supabase = await createClient();

    // Delete all highlights for a paper
    if (deleteAll && paperId) {
      const { error } = await supabase
        .from("highlights")
        .delete()
        .eq("paper_id", paperId);

      if (error) {
        console.error("Error deleting all highlights:", error);
        return NextResponse.json(
          { error: "Failed to delete highlights" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, deletedAll: true });
    }

    // Delete single highlight
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("highlights").delete().eq("id", id);

    if (error) {
      console.error("Error deleting highlight:", error);
      return NextResponse.json(
        { error: "Failed to delete highlight" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/highlights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
