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
            className: "text-emerald-400 bg-emerald-400/5 border-emerald-400/10",
        },
        processing: {
            icon: Loader2,
            label: "En cours",
            className: "text-amber-400 bg-amber-400/5 border-amber-400/10",
        },
        error: {
            icon: AlertCircle,
            label: "Erreur",
            className: "text-rose-400 bg-rose-400/5 border-rose-400/10",
        },
        ocr_needed: {
            icon: FileText,
            label: "OCR requis",
            className: "text-blue-400 bg-blue-400/5 border-blue-400/10",
        },
    };

    const { icon: Icon, label, className } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${className}`}
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

    const authors = paper.authors?.join(", ") || "—";
    const truncatedAuthors =
        authors.length > 40 ? `${authors.slice(0, 40)}...` : authors;

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm("Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.")) {
            setIsDeleting(true);
            try {
                const result = await deletePaper(paper.id, paper.storage_path);
                if (!result.success) {
                    alert("Erreur lors de la suppression : " + result.error);
                }
            } catch (error) {
                console.error("Delete error:", error);
                alert("Une erreur inattendue est survenue.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="group/row relative">
            <Link href={`/paper/${paper.id}`} className="block">
                <div className={`grid grid-cols-12 gap-4 items-center px-8 py-5 border-b border-white/5 transition-all duration-300 group-hover:bg-white/[0.03] group-hover:px-10 ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                    {/* Title & Authors */}
                    <div className="col-span-12 md:col-span-5 min-w-0">
                        <h3 className="text-base font-medium text-white/90 truncate group-hover:text-primary transition-colors">
                            {paper.title || "Sans titre"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-xs text-white/40 truncate flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
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
                        <span className="text-xs text-white/40 tabular-nums">{paper.page_count}p</span>
                    </div>

                    {/* Date */}
                    <div className="hidden md:block col-span-2">
                        <span className="text-xs text-white/40 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-50" />
                            {formattedDate}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className="hidden md:block col-span-2 flex flex-wrap gap-1.5 pr-10">
                        {paper.tags && paper.tags.length > 0 ? (
                            paper.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/60 border border-white/10"
                                >
                                    {tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-white/20">—</span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-rose-500/10 text-rose-500 opacity-0 group-hover/row:opacity-100 transition-all hover:bg-rose-500 hover:text-white disabled:opacity-50"
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
