"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { HighlightsPanel } from "@/components/highlights";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { MessageSquare, FileText, ChevronLeft } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { offsetsToRects } from "@/lib/highlight-renderer";
import type { PaperWithPages } from "@/types/paper";
import type { Citation } from "@/types/citation";
import type { TextItem } from "@/types/pdf";
import type {
  Highlight,
  HighlightRect,
} from "@/types/highlight";
import type {
  InlineTranslation,
  TranslationLanguage,
  TranslationSelection,
} from "@/types/translation";
import {
  TRANSLATION_LANGUAGES,
  isTranslationLanguage,
} from "@/types/translation";

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

interface PaperReaderProps {
  paper: PaperWithPages;
  pdfUrl: string;
}

export function PaperReader({ paper, pdfUrl }: PaperReaderProps) {
  const router = useRouter();

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightContext, setHighlightContext] = useState<{
    page: number;
    text: string;
  } | null>(null);
  const [imageContext, setImageContext] = useState<{
    imageData: string;
    page: number;
  } | null>(null);
  const [translations, setTranslations] = useState<InlineTranslation[]>([]);
  const [translationLanguage, setTranslationLanguage] =
    useState<TranslationLanguage>("fr");
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const [pdfWidthPercent, setPdfWidthPercent] = useState(70);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("reviewxiv-pdf-width");
    if (saved) {
      const width = parseFloat(saved);
      if (!isNaN(width) && width >= 50 && width <= 90) {
        setPdfWidthPercent(width);
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("reviewxiv-translation-language");
    if (saved && isTranslationLanguage(saved)) {
      setTranslationLanguage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "reviewxiv-translation-language",
      translationLanguage,
    );
  }, [translationLanguage]);

  const scrollToHighlightRef = useRef<((highlightId: string) => void) | null>(
    null,
  );

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

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`/api/translations?paperId=${paper.id}`);
        if (response.ok) {
          const data = await response.json();
          setTranslations(data.translations || []);
        }
      } catch (error) {
        console.error("Error fetching translations:", error);
      }
    };

    fetchTranslations();
  }, [paper.id]);

  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
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

  const handleHighlightClick = useCallback(
    (highlight: Highlight) => {
      if (scrollToHighlightRef.current) {
        scrollToHighlightRef.current(highlight.id);
        setCurrentPage(highlight.pageNumber);
        return;
      }

      const pageElement = document.querySelector(
        `[data-page-number="${highlight.pageNumber}"]`,
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentPage(highlight.pageNumber);
      }
    },
    [],
  );

  const handleHighlightAskAI = useCallback((highlight: Highlight) => {
    setHighlightContext({
      page: highlight.pageNumber,
      text: highlight.selectedText,
    });
    setActiveTab("chat");
  }, []);

  const handleHighlightDelete = useCallback((highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

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

  const handleV3Ask = useCallback((text: string, page: number) => {
    setHighlightContext({ page, text });
    setActiveTab("chat");
  }, []);

  const getSelectionOffsets = useCallback(
    (pageNumber: number, rects: HighlightRect[], selectedText: string) => {
      const pageTextItems = textItemsMap.get(pageNumber);
      if (pageTextItems && rects.length > 0) {
        const overlaps = (a: HighlightRect, b: HighlightRect) => {
          const overlapX =
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY =
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          return overlapX > 0 && overlapY > 0;
        };

        const matchingItems = pageTextItems.filter((item) =>
          rects.some((rect) =>
            overlaps(
              { x: item.x, y: item.y, width: item.width, height: item.height },
              rect,
            ),
          ),
        );

        if (matchingItems.length > 0) {
          const startOffset = Math.min(
            ...matchingItems.map((item) => item.startOffset),
          );
          const endOffset = Math.max(
            ...matchingItems.map((item) => item.endOffset),
          );

          return { startOffset, endOffset };
        }
      }

      const pageText = pageTextMap.get(pageNumber) || "";
      const normalizedText = selectedText.trim();
      if (normalizedText && pageText) {
        const index = pageText.indexOf(normalizedText);
        if (index >= 0) {
          return { startOffset: index, endOffset: index + normalizedText.length };
        }
      }

      return {
        startOffset: 0,
        endOffset: Math.max(0, selectedText.length),
      };
    },
    [pageTextMap, textItemsMap],
  );

  const handleTranslationToggle = useCallback(
    async (translationId: string, nextActive: boolean) => {
      setTranslations((prev) =>
        prev.map((translation) =>
          translation.id === translationId
            ? { ...translation, isActive: nextActive }
            : translation,
        ),
      );

      try {
        const response = await fetch(
          `/api/translations?id=${translationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: nextActive }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to toggle translation");
        }

        const data = await response.json();
        setTranslations((prev) =>
          prev.map((translation) =>
            translation.id === translationId
              ? { ...translation, isActive: data.translation.isActive }
              : translation,
          ),
        );
      } catch (error) {
        console.error("Error toggling translation:", error);
        setTranslations((prev) =>
          prev.map((translation) =>
            translation.id === translationId
              ? { ...translation, isActive: !nextActive }
              : translation,
          ),
        );
      }
    },
    [],
  );

  const handleV3Translate = useCallback(
    async (selection: TranslationSelection) => {
      const trimmedText = selection.text.trim();
      if (!trimmedText || selection.rects.length === 0) return;

      const { startOffset, endOffset } = getSelectionOffsets(
        selection.pageNumber,
        selection.rects,
        trimmedText,
      );

      const existingTranslation = translations.find(
        (translation) =>
          translation.pageNumber === selection.pageNumber &&
          translation.startOffset === startOffset &&
          translation.endOffset === endOffset &&
          translation.targetLanguage === translationLanguage,
      );

      if (existingTranslation) {
        if (!existingTranslation.isActive) {
          await handleTranslationToggle(existingTranslation.id, true);
        }
        return;
      }

      try {
        const translateResponse = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmedText,
            targetLanguage: translationLanguage,
          }),
        });

        if (!translateResponse.ok) {
          throw new Error("Translation request failed");
        }

        const translateData = await translateResponse.json();
        const translatedText = translateData.translation?.trim() || "";
        const sourceLanguage =
          translateData.sourceLanguage && translateData.sourceLanguage !== "auto"
            ? translateData.sourceLanguage
            : undefined;

        if (!translatedText) {
          throw new Error("Empty translation response");
        }

        const createResponse = await fetch("/api/translations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: paper.id,
            pageNumber: selection.pageNumber,
            sourceText: trimmedText,
            sourceLanguage,
            targetLanguage: translationLanguage,
            translatedText,
            startOffset,
            endOffset,
            rects: selection.rects,
            isActive: true,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to save translation");
        }

        const data = await createResponse.json();
        setTranslations((prev) => [...prev, data.translation]);
      } catch (error) {
        console.error("Error translating selection:", error);
      }
    },
    [
      getSelectionOffsets,
      handleTranslationToggle,
      paper.id,
      translationLanguage,
      translations,
    ],
  );

  const handleV3AskImage = useCallback((imageData: string, page: number) => {
    setImageContext({ imageData, page });
    setActiveTab("chat");
  }, []);

  const handleDeleteAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

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
    localStorage.setItem("reviewxiv-pdf-width", pdfWidthPercent.toString());
  }, [pdfWidthPercent]);

  const handleResizeReset = useCallback(() => {
    setPdfWidthPercent(70);
    localStorage.setItem("reviewxiv-pdf-width", "70");
  }, []);

  return (
    <div ref={containerRef} className="h-screen flex bg-background overflow-hidden selection:bg-primary/10 transition-colors duration-500">
      <div
        className="h-full border-r border-border relative bg-muted/20"
        style={{ width: `${pdfWidthPercent}%` }}
      >
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
           <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/library')}
            className="rounded-full bg-background/80 backdrop-blur-md border-border/50 apple-shadow hover:scale-105 transition-all"
           >
             <ChevronLeft className="h-4 w-4" />
           </Button>
        </div>

        <PDFHighlighterViewer
          pdfUrl={pdfUrl}
          paperId={paper.id}
          highlights={highlights}
          translations={translations}
          activeCitation={activeCitation}
          textItemsMap={textItemsMap}
          onHighlightCreate={handleV3HighlightCreate}
          onHighlightClick={handleHighlightClick}
          onAskSelection={handleV3Ask}
          onTranslateSelection={handleV3Translate}
          onAskImage={handleV3AskImage}
          onPageChange={setCurrentPage}
          scrollToHighlightRef={scrollToHighlightRef}
          onTranslationToggle={handleTranslationToggle}
          translationLanguage={translationLanguage}
          translationLanguageOptions={TRANSLATION_LANGUAGES}
          onTranslationLanguageChange={setTranslationLanguage}
        />
      </div>

      <ResizeHandle
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        onReset={handleResizeReset}
      />

      <div
        className="h-full flex flex-col min-h-0 overflow-hidden bg-card/30 backdrop-blur-sm"
        style={{ width: `${100 - pdfWidthPercent}%` }}
      >
        <div className="p-4 px-6 flex items-center justify-between border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-3 min-w-0">
            <Logo width={24} height={24} className="rounded-lg shadow-sm shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1
                className="text-[13px] font-bold text-foreground truncate max-w-[200px]"
                title={paper.title}
              >
                {paper.title}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                <span>{paper.page_count} pages</span>
                <span className="opacity-30">•</span>
                <span>Page {currentPage}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "chat" | "notes")}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="px-6 py-2 bg-background/50 border-b border-border/50">
            <TabsList className="h-9 w-full grid grid-cols-2 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger
                value="chat"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:apple-shadow transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Assistant
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:apple-shadow transition-all"
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                Highlights
              </TabsTrigger>
            </TabsList>
          </div>

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
            <div className="flex-1 overflow-hidden">
              <NotesPanel paperId={paper.id} currentPage={currentPage} />
            </div>

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
