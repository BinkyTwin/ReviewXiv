"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Check, FileText } from "lucide-react";

export interface TranslationResult {
  sourceText: string;
  targetLanguage: string;
  translatedText: string;
}

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  /** Callback to apply translation inline on the document */
  onApplyInline?: (result: TranslationResult) => void;
}

const LANGUAGES = [
  { code: "fr", name: "Francais" },
  { code: "en", name: "English" },
  { code: "es", name: "Espanol" },
  { code: "de", name: "Deutsch" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "pt", name: "Portugues" },
  { code: "it", name: "Italiano" },
  { code: "ar", name: "Arabic" },
];

export function TranslationModal({
  isOpen,
  onClose,
  originalText,
  onApplyInline,
}: TranslationModalProps) {
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalText,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Translation failed");
      }

      const data = await response.json();
      setTranslation(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (translation) {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyInline = () => {
    if (translation && onApplyInline) {
      onApplyInline({
        sourceText: originalText,
        targetLanguage,
        translatedText: translation,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setTranslation(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Traduire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Traduire en:</span>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleTranslate} disabled={isLoading} size="sm">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traduction...
                </>
              ) : (
                "Traduire"
              )}
            </Button>
          </div>

          {/* Original text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Texte original
            </label>
            <ScrollArea className="h-[100px] rounded-md border border-border p-3 bg-muted/30">
              <p className="text-sm">{originalText}</p>
            </ScrollArea>
          </div>

          {/* Translation result */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Traduction
              </label>
              {translation && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copie
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copier
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <ScrollArea className="h-[100px] rounded-md border border-border p-3 bg-card">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : translation ? (
                <p className="text-sm">{translation}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cliquez sur &quot;Traduire&quot; pour voir la traduction
                </p>
              )}
            </ScrollArea>
          </div>

          {/* Apply Inline button */}
          {translation && onApplyInline && (
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                onClick={handleApplyInline}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Appliquer sur le document
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
