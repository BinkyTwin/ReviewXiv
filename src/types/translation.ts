import type { HighlightRect } from "@/types/highlight";

export const TRANSLATION_LANGUAGES = [
  { value: "fr", label: "Francais" },
  { value: "en", label: "English" },
  { value: "es", label: "Espanol" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ar", label: "Arabic" },
] as const;

export type TranslationLanguage =
  (typeof TRANSLATION_LANGUAGES)[number]["value"];

export function isTranslationLanguage(
  value: string,
): value is TranslationLanguage {
  return TRANSLATION_LANGUAGES.some((language) => language.value === value);
}

export interface TranslationSelection {
  text: string;
  format: "pdf" | "html";
  pageNumber?: number;
  sectionId?: string;
  rects: HighlightRect[];
}

interface BaseTranslation {
  id: string;
  paperId: string;
  format: "pdf" | "html";
  sourceText: string;
  sourceLanguage?: string;
  targetLanguage: TranslationLanguage;
  translatedText: string;
  startOffset: number;
  endOffset: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PdfInlineTranslation extends BaseTranslation {
  format: "pdf";
  pageNumber: number;
  rects: HighlightRect[];
  sectionId?: null;
}

export interface HtmlInlineTranslation extends BaseTranslation {
  format: "html";
  sectionId: string;
  pageNumber?: number;
  rects: HighlightRect[];
}

export type InlineTranslation = PdfInlineTranslation | HtmlInlineTranslation;
