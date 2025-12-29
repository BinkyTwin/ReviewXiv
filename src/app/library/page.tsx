import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
    FileText,
    ArrowLeft,
    BookOpen,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import type { Paper } from "@/types/paper";
import { DocumentRow } from "./DocumentRow";

// Empty state component
function EmptyState() {
    return (
        <div className="text-center py-24 px-6 animate-in">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6 apple-shadow">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold mb-2">
                Votre bibliothèque est vide
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm leading-relaxed font-medium">
                Commencez par importer un document PDF pour commencer à lire et annoter avec l'IA.
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

export default async function LibraryPage() {
    const supabase = await createClient();

    // Fetch all papers, ordered by most recent
    const { data: papers, error } = await supabase
        .from("papers")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching papers:", error);
    }

    const paperList = (papers as Paper[]) || [];

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 transition-colors duration-500">
            {/* Background pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

            <div className="relative z-10 p-6 md:p-12 lg:p-20">
                {/* Header */}
                <div className="max-w-7xl mx-auto mb-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-6 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Link href="/">
                                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border/50 bg-background/50 backdrop-blur-md apple-shadow hover:scale-105 transition-all">
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                                                            </Link>
                                                                            <Logo width={40} height={40} className="rounded-xl shadow-lg" />
                                                                        </div>                                <ModeToggle />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                                    Ma Bibliothèque
                                </h1>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border/50">
                                    {paperList.length} DOCUMENT{paperList.length !== 1 ? "S" : ""}
                                </div>
                            </div>
                        </div>
                        <Link href="/">
                            <Button className="rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all duration-300 font-bold px-10 py-6 h-auto shadow-xl">
                                <FileText className="h-5 w-5 mr-3" />
                                Nouveau Document
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Library Container */}
                <div className="max-w-7xl mx-auto">
                    <div className="apple-card overflow-hidden">
                        {paperList.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div>
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
                                    {paperList.map((paper, i) => (
                                        <DocumentRow key={paper.id} paper={paper} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
