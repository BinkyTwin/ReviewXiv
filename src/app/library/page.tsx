import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
    FileText,
    ArrowLeft,
    Users,
    Calendar,
    Tag,
    BookOpen,
    AlertCircle,
    Loader2,
    CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { Paper } from "@/types/paper";

import { DocumentRow } from "./DocumentRow";

// Empty state component
function EmptyState() {
    return (
        <div className="text-center py-24 px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white/90 mb-2">
                Aucun document
            </h3>
            <p className="text-white/40 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Votre bibliothèque est vide. Commencez par importer un document PDF pour
                commencer à lire et annoter.
            </p>
            <Link href="/">
                <Button className="rounded-full px-8 bg-white text-black hover:bg-white/90 transition-all font-medium">
                    <FileText className="h-4 w-4 mr-2" />
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
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
            {/* Background pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 p-6 md:p-12 lg:p-20">
                {/* Header */}
                <div className="max-w-7xl mx-auto mb-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <Link href="/">
                                <Button variant="ghost" className="h-auto p-0 text-white/40 hover:text-white hover:bg-transparent transition-colors group">
                                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Retour
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                                    Ma Bibliothèque
                                </h1>
                                <p className="text-white/40 text-sm font-medium">
                                    {paperList.length} DOCUMENT{paperList.length !== 1 ? "S" : ""} AU TOTAL
                                </p>
                            </div>
                        </div>
                        <Link href="/">
                            <Button className="rounded-full bg-white text-black hover:scale-105 transition-all duration-300 font-semibold px-8 py-6 h-auto">
                                <FileText className="h-5 w-5 mr-3" />
                                Importer un fichier
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Library Container */}
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
                        {paperList.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div>
                                {/* Table Header */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                    <div className="col-span-5">Document</div>
                                    <div className="col-span-2">Statut</div>
                                    <div className="col-span-1 text-center">Taille</div>
                                    <div className="col-span-2">Ajouté le</div>
                                    <div className="col-span-2">Catégories</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-white/[0.02]">
                                    {paperList.map((paper) => (
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
