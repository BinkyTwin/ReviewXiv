"use client";

import { Search, SortAsc, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ReadingStatus } from "@/types/paper";

export type SortBy = "created_at" | "title" | "updated_at";
export type SortOrder = "asc" | "desc";

interface LibraryFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedTags: string[];
    availableTags: string[];
    onToggleTag: (tag: string) => void;
    selectedStatus: ReadingStatus | "all";
    onStatusChange: (status: ReadingStatus | "all") => void;
    sortBy: SortBy;
    onSortByChange: (value: SortBy) => void;
    sortOrder: SortOrder;
    onSortOrderChange: () => void;
}

const STATUS_LABELS: Record<ReadingStatus | "all", string> = {
    all: "Tous les statuts",
    want: "À lire",
    reading: "En cours",
    completed: "Terminé",
    archived: "Archivé",
};

const SORT_LABELS: Record<SortBy, string> = {
    created_at: "Date d'ajout",
    title: "Titre",
    updated_at: "Dernière lecture",
};

export function LibraryFilters({
    searchTerm,
    onSearchChange,
    selectedTags,
    availableTags,
    onToggleTag,
    selectedStatus,
    onStatusChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderChange,
}: LibraryFiltersProps) {
    return (
        <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                    type="text"
                    placeholder="Rechercher par titre, auteurs ou résumé..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-12 h-12 bg-background/50 backdrop-blur-md border-border/50 apple-shadow"
                />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
                {/* Status Filter */}
                <Select value={selectedStatus} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-[160px] h-10 bg-background/50 backdrop-blur-md border-border/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={onSortByChange}>
                    <SelectTrigger className="w-[180px] h-10 bg-background/50 backdrop-blur-md border-border/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(SORT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Sort Order Toggle */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onSortOrderChange}
                    className="h-10 w-10 bg-background/50 backdrop-blur-md border-border/50"
                    title={`Ordre ${sortOrder === "asc" ? "croissant" : "décroissant"}`}
                >
                    <SortAsc
                        className={`h-4 w-4 transition-transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                        }`}
                    />
                </Button>

                {/* Tags Filter */}
                {availableTags.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground/60" />
                        <div className="flex flex-wrap gap-1.5">
                            {availableTags.slice(0, 6).map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => onToggleTag(tag)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                            isSelected
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                                : "bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80"
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                            {availableTags.length > 6 && (
                                <span className="text-xs text-muted-foreground/60 px-2">
                                    +{availableTags.length - 6}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
