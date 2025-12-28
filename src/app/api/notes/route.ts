import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateNoteRequest, UpdateNoteRequest } from "@/types/note";

// GET /api/notes?paperId=xxx
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

    const { data: notes, error } = await supabase
      .from("notes")
      .select("*")
      .eq("paper_id", paperId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 },
      );
    }

    // Transform snake_case to camelCase
    const transformedNotes = notes.map((n) => ({
      id: n.id,
      paperId: n.paper_id,
      highlightId: n.highlight_id,
      title: n.title,
      content: n.content,
      pageNumber: n.page_number,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    return NextResponse.json({ notes: transformedNotes });
  } catch (error) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/notes
export async function POST(request: NextRequest) {
  try {
    const body: CreateNoteRequest = await request.json();

    const { paperId, highlightId, title, content, pageNumber } = body;

    if (!paperId || !content) {
      return NextResponse.json(
        { error: "paperId and content are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        paper_id: paperId,
        highlight_id: highlightId || null,
        title: title || null,
        content,
        page_number: pageNumber || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return NextResponse.json(
        { error: "Failed to create note" },
        { status: 500 },
      );
    }

    // Transform to camelCase
    const transformedNote = {
      id: note.id,
      paperId: note.paper_id,
      highlightId: note.highlight_id,
      title: note.title,
      content: note.content,
      pageNumber: note.page_number,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json({ note: transformedNote }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/notes?id=xxx
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body: UpdateNoteRequest = await request.json();
    const { title, content } = body;

    if (!title && !content) {
      return NextResponse.json(
        { error: "At least title or content is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    const { data: note, error } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      return NextResponse.json(
        { error: "Failed to update note" },
        { status: 500 },
      );
    }

    // Transform to camelCase
    const transformedNote = {
      id: note.id,
      paperId: note.paper_id,
      highlightId: note.highlight_id,
      title: note.title,
      content: note.content,
      pageNumber: note.page_number,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json({ note: transformedNote });
  } catch (error) {
    console.error("Error in PUT /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/notes?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
