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
  pageNumber: number;
  rects: HighlightRect[];
}

export interface InlineTranslation {
  id: string;
  paperId: string;
  pageNumber: number;
  sourceText: string;
  sourceLanguage?: string;
  targetLanguage: TranslationLanguage;
  translatedText: string;
  startOffset: number;
  endOffset: number;
  rects: HighlightRect[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
