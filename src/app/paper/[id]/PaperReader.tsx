"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SelectionPopover } from "@/components/pdf/SelectionPopover";
import { SelectionContextBar } from "@/components/reader/selection";
import { PersistentHighlightLayer } from "@/components/pdf/PersistentHighlightLayer";
import type { InlineTranslation } from "@/components/reader/layers";
import { TranslationModal } from "@/components/pdf/TranslationModal";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, FileText } from "lucide-react";
import { offsetsToRects } from "@/lib/highlight-renderer";
import type { PaperWithPages } from "@/types/paper";
import type { Citation } from "@/types/citation";
import type { TextItem } from "@/types/pdf";
import type { Highlight, HighlightColor, HighlightRect } from "@/types/highlight";
import type { SelectionData } from "@/components/pdf/PDFViewer";

// Dynamic import of PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@/components/pdf/PDFViewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-full bg-muted/30 p-4">
        <div className="space-y-4">
          <Skeleton className="h-[800px] w-full" />
        </div>
      </div>
    ),
  },
);

// Dynamic import of SmartPDFViewer (v2 with OCR)
const SmartPDFViewer = dynamic(
  () =>
    import("@/components/pdf-v2/SmartPDFViewer").then(
      (mod) => mod.SmartPDFViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-full bg-muted/30 p-4">
        <div className="space-y-4">
          <Skeleton className="h-[800px] w-full" />
          <div className="text-center text-sm text-muted-foreground">
            Chargement du Smart PDF Viewer...
          </div>
        </div>
      </div>
    ),
  },
);

// Import SmartSelectionData type from SmartPDFViewer
import type { SmartSelectionData } from "@/components/pdf-v2/SmartPDFViewer";

interface PaperReaderProps {
  paper: PaperWithPages;
  pdfUrl: string;
}

export function PaperReader({ paper, pdfUrl }: PaperReaderProps) {
  // Check for v2 feature flag: ?viewer=v2
  const searchParams = useSearchParams();
  const useSmartViewer = searchParams.get("viewer") === "v2";

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  type SelectionState = SelectionData & { rects?: HighlightRect[] };
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [highlightContext, setHighlightContext] = useState<{
    page: number;
    text: string;
  } | null>(null);
  const [translationModal, setTranslationModal] = useState<{
    isOpen: boolean;
    text: string;
  }>({ isOpen: false, text: "" });
  const [inlineTranslations, setInlineTranslations] = useState<
    InlineTranslation[]
  >([]);
  const pageRefsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pageRefsSnapshot, setPageRefsSnapshot] = useState<
    Map<number, HTMLDivElement>
  >(new Map());

  // Build text items map from paper pages
  const textItemsMap = useMemo(() => {
    const map = new Map<number, TextItem[]>();
    for (const page of paper.paper_pages) {
      map.set(page.page_number, page.text_items as TextItem[]);
    }
    return map;
  }, [paper.paper_pages]);

  // Fetch highlights on mount
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const response = await fetch(`/api/highlights?paperId=${paper.id}`);
        if (response.ok) {
          const data = await response.json();
          setHighlights(data.highlights || []);
        }
      } catch (error) {
        console.error("Error fetching highlights:", error);
      }
    };

    fetchHighlights();
  }, [paper.id]);

  // Handle citation click from chat
  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    // Clear after animation
    setTimeout(() => setActiveCitation(null), 3500);
  }, []);

  // Handle text selection in PDF
  const handleTextSelect = useCallback(
    (selectionData: SelectionData | null) => {
      setSelection(selectionData);
    },
    [],
  );

  // Create a new highlight
  const handleCreateHighlight = useCallback(
    async (color: HighlightColor) => {
      if (!selection) return;

      let rects: HighlightRect[] = [];

      if (useSmartViewer) {
        if (!selection.rects || selection.rects.length === 0) {
          console.warn("Missing selection rects for smart viewer highlight.");
          return;
        }
        rects = selection.rects;
      } else {
        // Get text items for the page to compute rects
        const pageTextItems = textItemsMap.get(selection.page);
        if (!pageTextItems) return;

        // Compute rects from offsets
        const citation: Citation = {
          page: selection.page,
          start: selection.startOffset,
          end: selection.endOffset,
          quote: selection.selectedText.slice(0, 100),
        };
        rects = offsetsToRects(citation, pageTextItems);
      }

      if (rects.length === 0) {
        return;
      }

      try {
        const response = await fetch("/api/highlights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: paper.id,
            pageNumber: selection.page,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
            selectedText: selection.selectedText,
            rects,
            color,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setHighlights((prev) => [...prev, data.highlight]);
        }
      } catch (error) {
        console.error("Error creating highlight:", error);
      }

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, paper.id, textItemsMap, useSmartViewer],
  );

  // Handle "Ask" button - pass context to chat
  const handleAsk = useCallback(() => {
    if (!selection) return;

    setHighlightContext({
      page: selection.page,
      text: selection.selectedText,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection]);

  // Handle "Translate" button
  const handleTranslate = useCallback(() => {
    if (!selection) return;

    setTranslationModal({
      isOpen: true,
      text: selection.selectedText,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection]);

  // === Smart Viewer (v2) Handlers ===
  // Handle text selection from SmartPDFViewer
  const handleSmartTextSelect = useCallback(
    (selectionData: SmartSelectionData | null) => {
      if (!selectionData) {
        setSelection(null);
        return;
      }
      // Convert SmartSelectionData to SelectionData format
      setSelection({
        page: selectionData.pageNumber,
        startOffset: selectionData.startOffset,
        endOffset: selectionData.endOffset,
        selectedText: selectionData.selectedText,
        position: selectionData.position,
        rects: selectionData.rects,
      });
    },
    []
  );

  // Close popover
  const handleClosePopover = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  // Handle applying translation inline on the document
  const handleApplyInlineTranslation = useCallback(
    (result: { sourceText: string; targetLanguage: string; translatedText: string }) => {
      if (!selection) return;

      // Create a new inline translation
      const newTranslation: InlineTranslation = {
        id: `translation-${Date.now()}`,
        pageNumber: selection.page,
        sourceText: result.sourceText,
        targetLanguage: result.targetLanguage,
        translatedText: result.translatedText,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        rects: [], // TODO: Compute rects from selection
        isActive: true, // Show translation by default
      };

      setInlineTranslations((prev) => [...prev, newTranslation]);
    },
    [selection]
  );

  // Handle translation toggle (show/hide inline translation)
  const handleTranslationToggle = useCallback((translationId: string) => {
    setInlineTranslations((prev) =>
      prev.map((t) =>
        t.id === translationId ? { ...t, isActive: !t.isActive } : t
      )
    );
  }, []);

  // Handle highlight click
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Could open a menu to edit/delete
    console.log("Highlight clicked:", highlight.id);
  }, []);

  // Store page refs from PDFViewer (we need this for PersistentHighlightLayer)
  // This is a workaround since PDFViewer manages its own refs
  useEffect(() => {
    // We'll update this when PDFViewer renders pages
    const observer = new MutationObserver(() => {
      const pages = document.querySelectorAll("[data-page-number]");
      let changed = false;

      pages.forEach((page) => {
        const pageNumber = parseInt(
          (page as HTMLElement).dataset.pageNumber || "0",
          10,
        );
        if (pageNumber > 0) {
          const existing = pageRefsRef.current.get(pageNumber);
          if (existing !== page) {
            pageRefsRef.current.set(pageNumber, page as HTMLDivElement);
            changed = true;
          }
        }
      });

      if (changed) {
        setPageRefsSnapshot(new Map(pageRefsRef.current));
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen flex bg-background">
      {/* PDF Viewer - 70% */}
      <div className="w-[70%] h-full border-r border-border relative">
        {useSmartViewer ? (
          /* Smart PDF Viewer v2 - Mistral OCR */
          <>
            <SmartPDFViewer
              pdfUrl={pdfUrl}
              highlights={highlights}
              activeCitation={activeCitation}
              inlineTranslations={inlineTranslations}
              onHighlightClick={handleHighlightClick}
              onTextSelect={handleSmartTextSelect}
              onPageChange={setCurrentPage}
              onTranslationToggle={handleTranslationToggle}
            />

            {/* Selection context bar for v2 - improved with keyboard shortcuts */}
            {selection && (
              <SelectionContextBar
                position={selection.position}
                selectedText={selection.selectedText}
                onHighlight={handleCreateHighlight}
                onAsk={handleAsk}
                onTranslate={handleTranslate}
                onClose={handleClosePopover}
              />
            )}
          </>
        ) : (
          /* Classic PDF Viewer */
          <>
            <PDFViewer
              pdfUrl={pdfUrl}
              textItems={textItemsMap}
              activeCitation={activeCitation}
              onPageChange={setCurrentPage}
              onTextSelect={handleTextSelect}
            />

            {/* Persistent highlights layer */}
            <PersistentHighlightLayer
              highlights={highlights}
              pageRefs={pageRefsSnapshot}
              onHighlightClick={handleHighlightClick}
            />

            {/* Selection popover */}
            {selection && (
              <SelectionPopover
                position={selection.position}
                onHighlight={handleCreateHighlight}
                onAsk={handleAsk}
                onTranslate={handleTranslate}
                onClose={handleClosePopover}
              />
            )}
          </>
        )}

        {/* Translation modal - shared between viewers */}
        <TranslationModal
          isOpen={translationModal.isOpen}
          onClose={() => setTranslationModal({ isOpen: false, text: "" })}
          originalText={translationModal.text}
          onApplyInline={useSmartViewer ? handleApplyInlineTranslation : undefined}
        />
      </div>

      {/* Right Panel - 30% */}
      <div className="w-[30%] h-full flex flex-col">
        <div className="p-3 border-b border-border bg-card">
          <h1
            className="font-semibold text-foreground truncate"
            title={paper.title}
          >
            {paper.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {paper.page_count} pages | Page {currentPage}
          </p>
        </div>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-card">
            <TabsTrigger
              value="chat"
              className="rounded-none data-[state=active]:bg-background"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none data-[state=active]:bg-background"
            >
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            <ChatPanel
              paperId={paper.id}
              pages={paper.paper_pages.map((p) => ({
                pageNumber: p.page_number,
                textContent: p.text_content,
              }))}
              onCitationClick={handleCitationClick}
              highlightContext={highlightContext}
              onHighlightContextClear={() => setHighlightContext(null)}
            />
          </TabsContent>

          <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
            <NotesPanel paperId={paper.id} currentPage={currentPage} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
