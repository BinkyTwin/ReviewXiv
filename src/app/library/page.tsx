"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, ArrowLeft, BookOpen } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import type { Paper } from "@/types/paper";
import { DocumentRow } from "./DocumentRow";
import { LibraryFilters, type SortBy, type SortOrder } from "./LibraryFilters";

// Empty state component
function EmptyState() {
    return (
        <div className="text-center py-24 px-6 animate-in">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6 apple-shadow">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            </div>
	            <h3 className="text-xl font-bold mb-2">Votre bibliothèque est vide</h3>
	            <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm leading-relaxed font-medium">
	                Commencez par importer un document PDF pour commencer à lire et annoter avec l&apos;IA.
	            </p>
            <Link href="/">
                <Button className="rounded-full px-10 py-6 h-auto bg-primary text-primary-foreground hover:scale-105 transition-all font-bold shadow-xl">
                    <FileText className="h-5 w-5 mr-2" />
                    Importer un document
                </Button>
            </Link>
        </div>
    );
}

// No results state component
function NoResultsState() {
    return (
        <div className="text-center py-24 px-6 animate-in">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-4 apple-shadow">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
            </div>
	            <h3 className="text-lg font-bold mb-2">Aucun résultat</h3>
	            <p className="text-muted-foreground text-sm">
	                Essayez d&apos;ajuster vos filtres de recherche
	            </p>
        </div>
    );
}

export default function LibraryPage() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<"all" | Paper["reading_status"]>("all");
    const [sortBy, setSortBy] = useState<SortBy>("created_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Load papers on mount
    useState(() => {
        async function loadPapers() {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("papers")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Error fetching papers:", error);
                } else {
                    setPapers(data as Paper[]);
                }
            } catch (error) {
                console.error("Error loading papers:", error);
            } finally {
                setLoading(false);
            }
        }
        loadPapers();
    });

    // Extract unique tags from papers
    const availableTags = useMemo(() => {
        const tagsSet = new Set<string>();
        papers.forEach((paper) => {
            if (paper.tags) {
                paper.tags.forEach((tag) => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }, [papers]);

    // Filter and sort papers
    const filteredAndSortedPapers = useMemo(() => {
        let result = [...papers];

        // Filter by search term (title, authors, abstract)
        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((paper) => {
                const titleMatch = paper.title?.toLowerCase().includes(lowerSearch);
                const authorsMatch = paper.authors?.some((author) =>
                    author.toLowerCase().includes(lowerSearch)
                );
                const abstractMatch = paper.abstract?.toLowerCase().includes(lowerSearch);
                return titleMatch || authorsMatch || abstractMatch;
            });
        }

        // Filter by tags
        if (selectedTags.length > 0) {
            result = result.filter((paper) => {
                if (!paper.tags || paper.tags.length === 0) return false;
                return selectedTags.every((tag) => paper.tags!.includes(tag));
            });
        }

        // Filter by reading status
        if (selectedStatus !== "all") {
            result = result.filter((paper) => paper.reading_status === selectedStatus);
        }

        // Sort papers
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "created_at":
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case "updated_at":
                    comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                    break;
                case "title":
                    comparison = (a.title || "").localeCompare(b.title || "");
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return result;
    }, [papers, searchTerm, selectedTags, selectedStatus, sortBy, sortOrder]);

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 transition-colors duration-500">
            {/* Background pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

            <div className="relative z-10 p-6 md:p-12 lg:p-20">
                {/* Header */}
                <div className="max-w-7xl mx-auto mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-6 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Link href="/">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-full h-10 w-10 border-border/50 bg-background/50 backdrop-blur-md apple-shadow hover:scale-105 transition-all"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Logo width={40} height={40} className="rounded-xl shadow-lg" />
                                </div>
                                <ModeToggle />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Ma Bibliothèque</h1>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border/50">
                                    {filteredAndSortedPapers.length} DOCUMENT{filteredAndSortedPapers.length !== 1 ? "S" : ""}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/?import=arxiv">
                                <Button
                                    variant="outline"
                                    className="rounded-full border-border/50 bg-background/50 backdrop-blur-sm px-8 py-6 h-auto text-sm font-semibold hover:bg-muted transition-colors apple-shadow"
                                >
                                    <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                                    Importer arXiv
                                </Button>
                            </Link>
                            <Link href="/">
                                <Button className="rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all duration-300 font-bold px-10 py-6 h-auto shadow-xl">
                                    <FileText className="h-5 w-5 mr-3" />
                                    Nouveau Document
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Library Container */}
                <div className="max-w-7xl mx-auto">
                    <div className="apple-card overflow-hidden">
                        {papers.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div>
                                {/* Filters */}
                                <div className="px-8 pt-6 pb-4 border-b border-border/50">
                                    <LibraryFilters
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}
                                        selectedTags={selectedTags}
                                        availableTags={availableTags}
                                        onToggleTag={handleToggleTag}
                                        selectedStatus={selectedStatus}
                                        onStatusChange={(status) => setSelectedStatus(status as typeof selectedStatus)}
                                        sortBy={sortBy}
                                        onSortByChange={setSortBy}
                                        sortOrder={sortOrder}
                                        onSortOrderChange={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                                    />
                                </div>

                                {filteredAndSortedPapers.length === 0 ? (
                                    <NoResultsState />
                                ) : (
                                    <>
                                        {/* Table Header */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 border-b border-border/50 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] bg-muted/30">
                                            <div className="col-span-5">Document</div>
                                            <div className="col-span-2">Statut</div>
                                            <div className="col-span-1 text-center">Pages</div>
                                            <div className="col-span-2">Ajouté le</div>
                                            <div className="col-span-2">Catégories</div>
                                        </div>

                                        {/* Table Body */}
                                        <div className="divide-y divide-border/30">
                                            {filteredAndSortedPapers.map((paper) => (
                                                <DocumentRow key={paper.id} paper={paper} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
