"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import type { PaperSection } from "@/types/paper";
import type { HtmlHighlight } from "@/types/highlight";
import type { HtmlInlineTranslation, TranslationSelection } from "@/types/translation";
import type { HtmlCitation } from "@/types/citation";
import { HtmlHighlightLayer } from "@/components/reader/HtmlHighlightLayer";
import { HtmlSelectionTip } from "@/components/reader/HtmlSelectionTip";
import { HtmlTranslationLayer } from "@/components/reader/HtmlTranslationLayer";
import { HtmlCitationFlash } from "@/components/reader/HtmlCitationFlash";
import { TableOfContents } from "@/components/reader/TableOfContents";
import { useHtmlSelection } from "@/hooks/useHtmlSelection";
import { cn } from "@/lib/utils";

interface HtmlViewerProps {
  paperId: string;
  sections: PaperSection[];
  highlights: HtmlHighlight[];
  translations: HtmlInlineTranslation[];
  activeCitation?: HtmlCitation | null;
  onHighlightCreate?: (highlight: HtmlHighlight) => void;
  onHighlightClick?: (highlight: HtmlHighlight) => void;
  onAskSelection?: (text: string, sectionId: string) => void;
  onTranslateSelection?: (selection: TranslationSelection) => void;
  onTranslationToggle?: (translationId: string, nextActive: boolean) => void;
  onSectionChange?: (sectionId: string) => void;
  scrollToHighlightRef?: React.MutableRefObject<
    ((highlightId: string) => void) | null
  >;
  className?: string;
}

export function HtmlViewer({
  paperId,
  sections,
  highlights,
  translations,
  activeCitation,
  onHighlightCreate,
  onHighlightClick,
  onAskSelection,
  onTranslateSelection,
  onTranslationToggle,
  onSectionChange,
  scrollToHighlightRef,
  className,
}: HtmlViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const { selection, clearSelection } = useHtmlSelection({
    containerRef: contentRef,
  });

  const sectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const section of sections) {
      const sectionKey =
        section.section_id || `section-${section.section_index + 1}`;
      map.set(sectionKey, section.section_index);
    }
    return map;
  }, [sections]);

  const sanitizedSections = useMemo(
    () =>
      sections.map((section) => {
        const sanitizedHtml = section.html_content
          ? DOMPurify.sanitize(section.html_content)
          : "";
        const hasHeading = /<h[1-6][\s>]/i.test(sanitizedHtml);
        return {
          ...section,
          sanitizedHtml,
          hasHeading,
        };
      }),
    [sections],
  );

  const handleHighlight = useCallback(
    (color: HtmlHighlight["color"]) => {
      if (!selection) return;
      const pageNumber = sectionIndexMap.get(selection.sectionId);

      const tempHighlight: HtmlHighlight = {
        id: `temp-${Date.now()}`,
        paperId,
        format: "html",
        sectionId: selection.sectionId,
        pageNumber: pageNumber !== undefined ? pageNumber + 1 : undefined,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        selectedText: selection.text,
        rects: [],
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onHighlightCreate?.(tempHighlight);
      clearSelection();
    },
    [clearSelection, onHighlightCreate, paperId, sectionIndexMap, selection],
  );

  const handleAsk = useCallback(() => {
    if (!selection) return;
    onAskSelection?.(selection.text, selection.sectionId);
    clearSelection();
  }, [clearSelection, onAskSelection, selection]);

  const handleTranslate = useCallback(() => {
    if (!selection) return;
    const translationSelection: TranslationSelection = {
      text: selection.text,
      format: "html",
      sectionId: selection.sectionId,
      rects: [],
    };
    onTranslateSelection?.(translationSelection);
    clearSelection();
  }, [clearSelection, onTranslateSelection, selection]);

  const handleSectionSelect = useCallback((sectionId: string) => {
    const container = contentRef.current;
    if (!container) return;
    const target = container.querySelector(
      `[data-section-id="${CSS.escape(sectionId)}"]`,
    );
    if (target && target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (!scrollToHighlightRef) return;

    scrollToHighlightRef.current = (highlightId: string) => {
      const highlight = highlights.find((item) => item.id === highlightId);
      if (!highlight || !contentRef.current) return;
      const target = contentRef.current.querySelector(
        `[data-section-id="${CSS.escape(highlight.sectionId)}"]`,
      );
      if (target && target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    return () => {
      scrollToHighlightRef.current = null;
    };
  }, [highlights, scrollToHighlightRef]);

  useEffect(() => {
    const container = scrollRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const sectionNodes = Array.from(
      content.querySelectorAll<HTMLElement>("[data-section-id]"),
    );
    if (sectionNodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const sectionId = visible[0].target.getAttribute("data-section-id");
          if (sectionId) {
            setActiveSectionId(sectionId);
            onSectionChange?.(sectionId);
          }
        }
      },
      { root: container, threshold: 0.25 },
    );

    sectionNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [onSectionChange, sections]);

  return (
    <div className={cn("flex h-full bg-background", className)}>
      <aside className="hidden lg:flex w-64 border-r border-border bg-muted/20">
        <TableOfContents
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={handleSectionSelect}
        />
      </aside>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto relative bg-background"
      >
        <div ref={contentRef} className="relative px-6 py-10 max-w-4xl mx-auto">
          {sanitizedSections.map((section) => {
            const sectionId =
              section.section_id || `section-${section.section_index + 1}`;
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                id={sectionId}
                className="mb-10 scroll-mt-24"
              >
                {section.title && !section.hasHeading && (
                  <h2 className="text-xl font-semibold mb-3 text-foreground">
                    {section.title}
                  </h2>
                )}
                <div
                  className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: section.sanitizedHtml }}
                />
              </section>
            );
          })}

          <HtmlHighlightLayer
            highlights={highlights}
            contentRef={contentRef}
            onHighlightClick={onHighlightClick}
          />

          <HtmlTranslationLayer
            translations={translations}
            contentRef={contentRef}
            onToggle={onTranslationToggle}
          />

          <HtmlCitationFlash citation={activeCitation || null} contentRef={contentRef} />
        </div>
      </div>

      {selection && (
        <HtmlSelectionTip
          selection={selection}
          onHighlight={handleHighlight}
          onAsk={handleAsk}
          onTranslate={handleTranslate}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
