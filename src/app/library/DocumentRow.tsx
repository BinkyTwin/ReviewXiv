"use client";

import Link from "next/link";
import { Users, Calendar, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deletePaper } from "./actions";
import type { Paper } from "@/types/paper";
import {
    CheckCircle,
    AlertCircle,
    FileText
} from "lucide-react";

// Status badge component (moved from page.tsx)
function StatusBadge({ status }: { status: Paper["status"] }) {
    const config = {
        ready: {
            icon: CheckCircle,
            label: "Prêt",
            className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        processing: {
            icon: Loader2,
            label: "Analyse",
            className: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        },
        error: {
            icon: AlertCircle,
            label: "Erreur",
            className: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        },
        ocr_needed: {
            icon: FileText,
            label: "OCR requis",
            className: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        },
    };

    const { icon: Icon, label, className } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${className}`}
        >
            <Icon className={`h-2.5 w-2.5 ${status === "processing" ? "animate-spin" : ""}`} />
            {label}
        </span>
    );
}

export function DocumentRow({ paper }: { paper: Paper }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const formattedDate = new Date(paper.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const authors = paper.authors?.join(", ") || "Chercheurs non spécifiés";
    const truncatedAuthors =
        authors.length > 50 ? `${authors.slice(0, 50)}...` : authors;
    const countLabel = paper.format === "html" ? "sec" : "p";

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
            setIsDeleting(true);
            try {
                const result = await deletePaper(paper.id, paper.storage_path);
                if (!result.success) {
                    alert("Erreur : " + result.error);
                }
            } catch (error) {
                console.error("Delete error:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="group/row relative animate-in">
            <Link href={`/paper/${paper.id}`} className="block">
                <div className={`grid grid-cols-12 gap-4 items-center px-8 py-6 transition-all duration-300 group-hover:bg-muted/50 ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                    {/* Title & Authors */}
                    <div className="col-span-12 md:col-span-5 min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {paper.title || "Document sans titre"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground font-medium truncate flex items-center gap-1.5">
                                <Users className="h-3 w-3 opacity-60" />
                                {truncatedAuthors}
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="hidden md:block col-span-2">
                        <StatusBadge status={paper.status} />
                    </div>

                    {/* Pages */}
                    <div className="hidden md:block col-span-1 text-center">
                        <span className="text-xs font-bold text-muted-foreground tabular-nums bg-muted px-2 py-1 rounded-lg border border-border/50">
                            {paper.page_count}
                            {countLabel}
                        </span>
                    </div>

                    {/* Date */}
                    <div className="hidden md:block col-span-2">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-50" />
                            {formattedDate}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className="hidden md:block col-span-2 flex flex-wrap gap-1.5 pr-12">
                        {paper.tags && paper.tags.length > 0 ? (
                            paper.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground border border-border/50"
                                >
                                    {tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="absolute right-6 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover/row:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 flex items-center justify-center apple-shadow active:scale-90"
                title="Supprimer le document"
            >
                {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </div>
    );
}
