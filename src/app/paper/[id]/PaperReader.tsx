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
import { HighlightsPanel } from "@/components/highlights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { MessageSquare, FileText } from "lucide-react";
import { offsetsToRects } from "@/lib/highlight-renderer";
import type { PaperWithPages } from "@/types/paper";
import type { Citation } from "@/types/citation";
import type { TextItem } from "@/types/pdf";
import type {
  Highlight,
  HighlightColor,
  HighlightRect,
} from "@/types/highlight";
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

// Dynamic import of PDFHighlighterViewer (v3 with react-pdf-highlighter)
const PDFHighlighterViewer = dynamic(
  () =>
    import("@/components/pdf-highlighter").then(
      (mod) => mod.PDFHighlighterViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-full bg-muted/30 p-4">
        <div className="space-y-4">
          <Skeleton className="h-[800px] w-full" />
          <div className="text-center text-sm text-muted-foreground">
            Chargement du PDF Highlighter...
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
  // Check for viewer feature flag: ?viewer=v2 or ?viewer=v3
  const searchParams = useSearchParams();
  const viewerMode = searchParams.get("viewer");
  const useSmartViewer = viewerMode === "v2";
  const useHighlighterViewer = viewerMode === "v3";

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  type SelectionState = SelectionData & { rects?: HighlightRect[] };
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [highlightContext, setHighlightContext] = useState<{
    page: number;
    text: string;
  } | null>(null);
  const [imageContext, setImageContext] = useState<{
    imageData: string;
    page: number;
  } | null>(null);
  const [translationModal, setTranslationModal] = useState<{
    isOpen: boolean;
    text: string;
  }>({ isOpen: false, text: "" });
  const [inlineTranslations, setInlineTranslations] = useState<
    InlineTranslation[]
  >([]);
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  // Panel resize state - stored in localStorage for persistence
  const [pdfWidthPercent, setPdfWidthPercent] = useState(70);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved panel width from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("deepread-pdf-width");
    if (saved) {
      const width = parseFloat(saved);
      if (!isNaN(width) && width >= 50 && width <= 90) {
        setPdfWidthPercent(width);
      }
    }
  }, []);

  const pageRefsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pageRefsSnapshot, setPageRefsSnapshot] = useState<
    Map<number, HTMLDivElement>
  >(new Map());

  // Ref for PDFHighlighterViewer scroll function
  const scrollToHighlightRef = useRef<((highlightId: string) => void) | null>(
    null,
  );

  // Build text items map from paper pages
  const textItemsMap = useMemo(() => {
    const map = new Map<number, TextItem[]>();
    for (const page of paper.paper_pages) {
      map.set(page.page_number, page.text_items as TextItem[]);
    }
    return map;
  }, [paper.paper_pages]);

  const pageTextMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const page of paper.paper_pages) {
      map.set(page.page_number, page.text_content || "");
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

  // Fetch inline translations on mount
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`/api/translations?paperId=${paper.id}`);
        if (response.ok) {
          const data = await response.json();
          setInlineTranslations(data.translations || []);
        }
      } catch (error) {
        console.error("Error fetching translations:", error);
      }
    };

    fetchTranslations();
  }, [paper.id]);

  // Handle citation click from chat
  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    // Clear after animation
    setTimeout(() => setActiveCitation(null), 3500);
  }, []);

  const handleSaveCitation = useCallback(
    async (citation: Citation) => {
      const existingHighlight = highlights.find(
        (highlight) =>
          highlight.pageNumber === citation.page &&
          highlight.startOffset === citation.start &&
          highlight.endOffset === citation.end,
      );

      if (existingHighlight) {
        return;
      }

      const pageTextItems = textItemsMap.get(citation.page);
      if (!pageTextItems) {
        console.warn("Missing text items for citation highlight.");
        return;
      }

      const rects = offsetsToRects(citation, pageTextItems);
      if (rects.length === 0) {
        console.warn("No rects found for citation highlight.");
        return;
      }

      const pageText = pageTextMap.get(citation.page) || "";
      const selectedText =
        citation.start >= 0 && citation.end <= pageText.length
          ? pageText.slice(citation.start, citation.end).trim()
          : citation.quote || "";

      try {
        const response = await fetch("/api/highlights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: paper.id,
            pageNumber: citation.page,
            startOffset: citation.start,
            endOffset: citation.end,
            selectedText: selectedText || citation.quote || "",
            rects,
            color: "yellow",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setHighlights((prev) => [...prev, data.highlight]);
        } else {
          console.error("Failed to save citation highlight.");
        }
      } catch (error) {
        console.error("Error saving citation highlight:", error);
      }
    },
    [highlights, pageTextMap, paper.id, textItemsMap],
  );

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
    [],
  );

  // Close popover
  const handleClosePopover = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  // Handle applying translation inline on the document
  const handleApplyInlineTranslation = useCallback(
    async (result: {
      sourceText: string;
      targetLanguage: string;
      translatedText: string;
    }) => {
      if (!selection) return;

      // Get rects from selection if available
      const rects = selection.rects || [];

      try {
        const response = await fetch("/api/translations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: paper.id,
            pageNumber: selection.page,
            sourceText: result.sourceText,
            targetLanguage: result.targetLanguage,
            translatedText: result.translatedText,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
            rects,
            isActive: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setInlineTranslations((prev) => [...prev, data.translation]);
        } else {
          console.error("Failed to save translation");
        }
      } catch (error) {
        console.error("Error saving translation:", error);
      }
    },
    [selection, paper.id],
  );

  // Handle translation toggle (show/hide inline translation)
  const handleTranslationToggle = useCallback(
    async (translationId: string) => {
      // Find current state
      const translation = inlineTranslations.find(
        (t) => t.id === translationId,
      );
      if (!translation) return;

      const newIsActive = !translation.isActive;

      // Optimistic update
      setInlineTranslations((prev) =>
        prev.map((t) =>
          t.id === translationId ? { ...t, isActive: newIsActive } : t,
        ),
      );

      // Persist to database
      try {
        await fetch(`/api/translations?id=${translationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newIsActive }),
        });
      } catch (error) {
        console.error("Error updating translation:", error);
        // Revert on error
        setInlineTranslations((prev) =>
          prev.map((t) =>
            t.id === translationId ? { ...t, isActive: !newIsActive } : t,
          ),
        );
      }
    },
    [inlineTranslations],
  );

  // Handle highlight click - navigate to the highlight in the PDF
  const handleHighlightClick = useCallback(
    (highlight: Highlight) => {
      // For v3 viewer, use the scrollToHighlight ref
      if (useHighlighterViewer && scrollToHighlightRef.current) {
        scrollToHighlightRef.current(highlight.id);
        setCurrentPage(highlight.pageNumber);
        return;
      }

      // For other viewers, scroll to the page containing the highlight
      const pageElement = document.querySelector(
        `[data-page-number="${highlight.pageNumber}"]`,
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentPage(highlight.pageNumber);
      }
    },
    [useHighlighterViewer],
  );

  // Handle asking AI about a highlight - set context and switch to chat tab
  const handleHighlightAskAI = useCallback((highlight: Highlight) => {
    setHighlightContext({
      page: highlight.pageNumber,
      text: highlight.selectedText,
    });
    // Switch to chat tab
    setActiveTab("chat");
  }, []);

  // Handle deleting a single highlight
  const handleHighlightDelete = useCallback((highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

  // Handle highlight creation from PDFHighlighterViewer (v3)
  const handleV3HighlightCreate = useCallback(async (highlight: Highlight) => {
    try {
      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: highlight.paperId,
          pageNumber: highlight.pageNumber,
          startOffset: highlight.startOffset,
          endOffset: highlight.endOffset,
          selectedText: highlight.selectedText,
          rects: highlight.rects,
          color: highlight.color,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHighlights((prev) => [...prev, data.highlight]);
      }
    } catch (error) {
      console.error("Error creating highlight:", error);
    }
  }, []);

  // Handle "Ask" from v3 viewer
  const handleV3Ask = useCallback((text: string, page: number) => {
    setHighlightContext({ page, text });
    setActiveTab("chat");
  }, []);

  // Handle "Translate" from v3 viewer
  const handleV3Translate = useCallback((text: string, page: number) => {
    setTranslationModal({ isOpen: true, text });
  }, []);

  // Handle "Ask" for images from v3 viewer (area selection)
  const handleV3AskImage = useCallback((imageData: string, page: number) => {
    setImageContext({ imageData, page });
    setActiveTab("chat");
  }, []);

  // Handle deleting all highlights
  const handleDeleteAllHighlights = useCallback(() => {
    setHighlights([]);
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

  // Panel resize handlers
  const handleResize = useCallback((deltaX: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    setPdfWidthPercent((prev) => {
      const newWidth = Math.min(90, Math.max(50, prev + deltaPercent));
      return newWidth;
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    localStorage.setItem("deepread-pdf-width", pdfWidthPercent.toString());
  }, [pdfWidthPercent]);

  const handleResizeReset = useCallback(() => {
    setPdfWidthPercent(70);
    localStorage.setItem("deepread-pdf-width", "70");
  }, []);

  return (
    <div ref={containerRef} className="h-screen flex bg-background">
      {/* PDF Viewer - resizable */}
      <div
        className="h-full border-r border-border relative"
        style={{ width: `${pdfWidthPercent}%` }}
      >
        {useHighlighterViewer ? (
          /* PDF Highlighter Viewer v3 - react-pdf-highlighter */
          <PDFHighlighterViewer
            pdfUrl={pdfUrl}
            paperId={paper.id}
            highlights={highlights}
            activeCitation={activeCitation}
            textItemsMap={textItemsMap}
            onHighlightCreate={handleV3HighlightCreate}
            onHighlightClick={handleHighlightClick}
            onHighlightDelete={handleHighlightDelete}
            onAskSelection={handleV3Ask}
            onTranslateSelection={handleV3Translate}
            onAskImage={handleV3AskImage}
            scrollToHighlightRef={scrollToHighlightRef}
          />
        ) : useSmartViewer ? (
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
          onApplyInline={
            useSmartViewer ? handleApplyInlineTranslation : undefined
          }
        />
      </div>

      {/* Resize Handle */}
      <ResizeHandle
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        onReset={handleResizeReset}
      />

      {/* Right Panel - resizable */}
      <div
        className="h-full flex flex-col min-h-0 overflow-hidden"
        style={{ width: `${100 - pdfWidthPercent}%` }}
      >
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

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "chat" | "notes")}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
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

          <TabsContent
            value="chat"
            className="flex-1 m-0 overflow-hidden flex min-h-0"
          >
            <ChatPanel
              paperId={paper.id}
              pages={paper.paper_pages.map((p) => ({
                pageNumber: p.page_number,
                textContent: p.text_content,
              }))}
              onCitationClick={handleCitationClick}
              onSaveCitation={handleSaveCitation}
              highlightContext={highlightContext}
              onHighlightContextClear={() => setHighlightContext(null)}
              imageContext={imageContext}
              onImageContextClear={() => setImageContext(null)}
            />
          </TabsContent>

          <TabsContent
            value="notes"
            className="flex-1 m-0 overflow-hidden flex flex-col"
          >
            {/* Notes section - takes available space */}
            <div className="flex-1 overflow-hidden">
              <NotesPanel paperId={paper.id} currentPage={currentPage} />
            </div>

            {/* Highlights section - fixed at bottom */}
            <HighlightsPanel
              highlights={highlights}
              paperId={paper.id}
              onHighlightClick={handleHighlightClick}
              onAskAI={handleHighlightAskAI}
              onDelete={handleHighlightDelete}
              onDeleteAll={handleDeleteAllHighlights}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
