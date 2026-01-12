"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Highlighter,
  Trash2,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Highlight, HighlightColor } from "@/types/highlight";

interface HighlightsPanelProps {
  highlights: Highlight[];
  paperId: string;
  onHighlightClick?: (highlight: Highlight) => void;
  onAskAI?: (highlight: Highlight) => void;
  onDelete?: (highlightId: string) => void;
  onDeleteAll?: () => void;
  sectionTitles?: Record<string, string>;
  className?: string;
}

const COLOR_MAP: Record<HighlightColor, string> = {
  yellow: "bg-highlight-yellow",
  green: "bg-highlight-green",
  blue: "bg-highlight-blue",
  red: "bg-highlight-red",
  purple: "bg-highlight-purple",
};

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: "Jaune",
  green: "Vert",
  blue: "Bleu",
  red: "Rouge",
  purple: "Violet",
};

export function HighlightsPanel({
  highlights,
  paperId,
  onHighlightClick,
  onAskAI,
  onDelete,
  onDeleteAll,
  sectionTitles,
  className,
}: HighlightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const pdfHighlights = highlights.filter((h) => h.format !== "html");
  const htmlHighlights = highlights.filter((h) => h.format === "html");

  const groupedPdfHighlights = pdfHighlights.reduce(
    (acc, highlight) => {
      const page = highlight.pageNumber ?? 1;
      if (!acc[page]) {
        acc[page] = [];
      }
      acc[page].push(highlight);
      return acc;
    },
    {} as Record<number, Highlight[]>,
  );

  const groupedHtmlHighlights = htmlHighlights.reduce(
    (acc, highlight) => {
      const sectionId = highlight.sectionId || "unknown-section";
      if (!acc[sectionId]) {
        acc[sectionId] = [];
      }
      acc[sectionId].push(highlight);
      return acc;
    },
    {} as Record<string, Highlight[]>,
  );

  const handleDelete = async (highlightId: string) => {
    try {
      const response = await fetch(`/api/highlights?id=${highlightId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.(highlightId);
      }
    } catch (error) {
      console.error("Error deleting highlight:", error);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/highlights?paperId=${paperId}&all=true`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        onDeleteAll?.();
      }
    } catch (error) {
      console.error("Error deleting all highlights:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className={cn("flex flex-col border-t border-border", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Highlighter className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Surlignages</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {highlights.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="flex flex-col">
          {/* Actions bar */}
          {highlights.length > 0 && (
            <div className="flex justify-end px-3 py-2 border-b border-border/50">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Supprimer tous les surlignages ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera{" "}
                      <span className="font-medium text-foreground">
                        {highlights.length} surlignage
                        {highlights.length > 1 ? "s" : ""}
                      </span>{" "}
                      de ce document. Cette action est irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Highlights list */}
          <ScrollArea className="max-h-[250px]">
            <div className="p-2 space-y-1">
              {highlights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Highlighter className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">Aucun surlignage</p>
                  <p className="text-xs mt-0.5">
                    Selectionnez du texte et appuyez sur H
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(groupedPdfHighlights)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([page, pageHighlights]) => (
                      <div key={`page-${page}`} className="space-y-1">
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pt-1">
                          Page {page}
                        </div>
                        {pageHighlights.map((highlight) => (
                          <div
                            key={highlight.id}
                            className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors"
                          >
                            <div
                              className={cn(
                                "w-3 h-3 rounded-sm mt-0.5 flex-shrink-0",
                                COLOR_MAP[highlight.color],
                              )}
                              title={COLOR_LABELS[highlight.color]}
                            />

                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs leading-relaxed cursor-pointer hover:text-primary transition-colors"
                                onClick={() => onHighlightClick?.(highlight)}
                                title="Cliquer pour voir dans le document"
                              >
                                {truncateText(highlight.selectedText)}
                              </p>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onHighlightClick?.(highlight)}
                                title="Voir dans le document"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onAskAI?.(highlight)}
                                title="Demander a l'IA"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(highlight.id)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                  {Object.entries(groupedHtmlHighlights)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([sectionId, sectionHighlights]) => {
                      const label =
                        sectionTitles?.[sectionId] || `Section ${sectionId}`;
                      return (
                        <div key={`section-${sectionId}`} className="space-y-1">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pt-1">
                            {label}
                          </div>
                          {sectionHighlights.map((highlight) => (
                            <div
                              key={highlight.id}
                              className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors"
                            >
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-sm mt-0.5 flex-shrink-0",
                                  COLOR_MAP[highlight.color],
                                )}
                                title={COLOR_LABELS[highlight.color]}
                              />

                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-xs leading-relaxed cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => onHighlightClick?.(highlight)}
                                  title="Cliquer pour voir dans le document"
                                >
                                  {truncateText(highlight.selectedText)}
                                </p>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => onHighlightClick?.(highlight)}
                                  title="Voir dans le document"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => onAskAI?.(highlight)}
                                  title="Demander a l'IA"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(highlight.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
