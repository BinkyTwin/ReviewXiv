"use client";

import { cn } from "@/lib/utils";
import type { PaperSection } from "@/types/paper";

interface TableOfContentsProps {
  sections: PaperSection[];
  activeSectionId?: string | null;
  onSelect: (sectionId: string) => void;
  className?: string;
}

export function TableOfContents({
  sections,
  activeSectionId,
  onSelect,
  className,
}: TableOfContentsProps) {
  const levels = sections
    .map((section) => section.level)
    .filter((level): level is number => typeof level === "number");
  const baseLevel = levels.length > 0 ? Math.min(...levels) : 1;

  return (
    <div className={cn("h-full overflow-auto p-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Table of Contents
      </div>
      <div className="space-y-2">
        {sections.map((section) => {
          const sectionId = section.section_id || `section-${section.section_index + 1}`;
          const indent =
            typeof section.level === "number"
              ? (section.level - baseLevel) * 12
              : 0;
          const label =
            section.title?.trim() ||
            `Section ${section.section_index + 1}`;

          return (
            <button
              key={sectionId}
              type="button"
              className={cn(
                "w-full text-left text-xs px-2 py-1 rounded-md transition-colors",
                "hover:bg-muted/60",
                activeSectionId === sectionId
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground",
              )}
              style={{ paddingLeft: 8 + indent }}
              onClick={() => onSelect(sectionId)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
