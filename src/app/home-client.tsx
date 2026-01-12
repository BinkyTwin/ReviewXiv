"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PaperUploader } from "@/components/upload/PaperUploader";
import { ModeToggle } from "@/components/mode-toggle";
import { Logo } from "@/components/Logo";
import {
  FileText,
  MessageSquare,
  Highlighter,
  Upload,
  BookOpen,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Import Intelligent",
    description: "Analyse et extraction de structure pour vos papiers académiques.",
    glow: "bg-emerald-500/10",
  },
  {
    icon: Highlighter,
    title: "Surlignage Précis",
    description: "Citations synchronisées et gestion intelligente des passages clés.",
    glow: "bg-amber-500/10",
  },
  {
    icon: MessageSquare,
    title: "IA Conversationnelle",
    description: "Discutez avec vos documents et obtenez des réponses sourcées.",
    glow: "bg-blue-500/10",
  },
];

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUploader, setShowUploader] = useState(
    () => Boolean(searchParams.get("import")),
  );

  const handleUploadComplete = (paperId: string) => {
    router.push(`/paper/${paperId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 overflow-x-hidden transition-colors duration-500">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Logo width={32} height={32} className="rounded-xl shadow-lg" />
          <span className="font-bold tracking-tight text-xl">ReviewXiv</span>
        </div>
        <ModeToggle />
      </header>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center space-y-8 max-w-4xl mb-20 animate-in">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary border border-border/50 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground apple-shadow">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Assistant de Recherche IA</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
            Review<span className="text-muted-foreground/30">Xiv</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Redéfinissez votre lecture académique.
            <span className="text-foreground"> Citations précises</span>,
            <span className="text-foreground"> surlignage intelligent</span> et
            <span className="text-foreground"> insights par IA</span>.
          </p>
        </div>

        {showUploader ? (
          <div className="w-full max-w-2xl animate-in">
            <div className="apple-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    Importer un document
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    PDF uniquement · Max 50Mo
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setShowUploader(false)}
                >
                  Annuler
                </Button>
              </div>
              <PaperUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-6xl space-y-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative apple-card p-8 animate-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`absolute top-0 left-0 w-24 h-24 rounded-full ${feature.glow} blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform duration-500 apple-shadow">
                      <feature.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground/90">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col md:flex-row items-center justify-center gap-6 animate-in"
              style={{ animationDelay: "400ms" }}
            >
              <Button
                onClick={() => setShowUploader(true)}
                className="w-full md:w-auto rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all duration-300 font-bold px-10 py-7 h-auto text-lg group shadow-xl"
              >
                <Upload className="h-5 w-5 mr-3 group-hover:-translate-y-1 transition-transform" />
                Importer un document
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/library")}
                className="w-full md:w-auto rounded-full border-border/50 bg-background/50 backdrop-blur-sm px-10 py-7 h-auto text-lg font-semibold hover:bg-muted transition-colors group apple-shadow"
              >
                <BookOpen className="h-5 w-5 mr-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                Ma Bibliothèque
                <ChevronRight className="h-5 w-5 ml-2 text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}

        <div
          className="mt-32 flex flex-col items-center gap-4 text-muted-foreground/30 animate-in"
          style={{ animationDelay: "500ms" }}
        >
          <div className="h-px w-12 bg-border/50" />
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2 tracking-widest leading-none">
              <Logo width={12} height={12} className="opacity-50 grayscale" />{" "}
              Powered by ReviewXiv AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

