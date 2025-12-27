"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaperUploader } from "@/components/upload/PaperUploader";
import {
  FileText,
  MessageSquare,
  Highlighter,
  Upload,
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  ChevronRight
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Import Intelligent",
    description: "Analyse et extraction de structure pour vos papiers académiques.",
    glow: "bg-emerald-500/10",
    delay: "animation-delay-100",
  },
  {
    icon: Highlighter,
    title: "Surlignage Précis",
    description: "Citations synchronisées et gestion intelligente des passages clés.",
    glow: "bg-amber-500/10",
    delay: "animation-delay-200",
  },
  {
    icon: MessageSquare,
    title: "IA Conversationnelle",
    description: "Discutez avec vos documents et obtenez des réponses sourcées.",
    glow: "bg-blue-500/10",
    delay: "animation-delay-300",
  },
];

export default function Home() {
  const router = useRouter();
  const [showUploader, setShowUploader] = useState(false);

  const handleUploadComplete = (paperId: string) => {
    router.push(`/paper/${paperId}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 overflow-x-hidden">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">

        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-4xl mb-20 animate-fadeInUp">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Assistant de Recherche IA</span>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
            Deep<span className="text-white/20">Read</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
            Redéfinissez votre lecture académique.
            <span className="text-white/90"> Citations précises</span>,
            <span className="text-white/90"> surlignage intelligent</span> et
            <span className="text-white/90"> insights par IA</span>.
          </p>
        </div>

        {showUploader ? (
          <div className="w-full max-w-2xl animate-fadeInUp">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Importer un document</h2>
                  <p className="text-white/40 text-sm">PDF uniquement · Max 50Mo</p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full text-white/40 hover:text-white hover:bg-white/5"
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
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`group relative bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 animate-fadeInUp opacity-0 fill-forwards ${feature.delay}`}
                >
                  <div className={`absolute top-0 left-0 w-24 h-24 rounded-full ${feature.glow} blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <feature.icon className="h-6 w-6 text-white/70" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white/90">{feature.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed font-medium">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Container */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-fadeInUp opacity-0 fill-forwards animation-delay-400">
              <Button
                onClick={() => setShowUploader(true)}
                className="w-full md:w-auto rounded-full bg-white text-black hover:scale-105 transition-all duration-300 font-bold px-10 py-7 h-auto text-lg group"
              >
                <Upload className="h-5 w-5 mr-3 group-hover:-translate-y-1 transition-transform" />
                Importer un document
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/library")}
                className="w-full md:w-auto rounded-full border border-white/10 px-10 py-7 h-auto text-lg font-semibold hover:bg-white/5 transition-colors group"
              >
                <BookOpen className="h-5 w-5 mr-3 text-white/40 group-hover:text-white transition-colors" />
                Ma Bibliothèque
                <ChevronRight className="h-5 w-5 ml-2 text-white/20 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-32 flex flex-col items-center gap-4 text-white/20 animate-fadeInUp opacity-0 fill-forwards animation-delay-500">
          <div className="h-px w-12 bg-white/10" />
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2 tracking-widest leading-none">
              <Zap className="h-3 w-3" /> Powered by Intelligence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

