import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PaperReader } from "./PaperReader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch paper with pages
  const { data: paper, error } = await supabase
    .from("papers")
    .select(
      `
      *,
      paper_pages (
        id,
        page_number,
        text_content,
        text_items,
        width,
        height,
        has_text
      ),
      paper_sections (
        id,
        paper_id,
        section_index,
        section_id,
        title,
        level,
        text_content,
        html_content,
        parent_section_id,
        created_at
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !paper) {
    notFound();
  }

  if (paper.format === "html") {
    return <PaperReader paper={paper} />;
  }

  // Get signed URL for PDF
  const { data: signedUrl } = await supabase.storage
    .from("papers")
    .createSignedUrl(paper.storage_path, 3600); // 1 hour expiry

  if (!signedUrl) {
    throw new Error("Failed to get PDF URL");
  }

  return <PaperReader paper={paper} pdfUrl={signedUrl.signedUrl} />;
}
