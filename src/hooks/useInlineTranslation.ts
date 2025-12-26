"use client";

import { useState, useCallback } from "react";
import { TextSelection, TextBlock } from "@/lib/ocr/types";

interface TranslationState {
  /** Block ID -> translated content */
  translations: Map<string, string>;
  /** Currently translating selection */
  activeTranslation: TextSelection | null;
  /** Is translation widget visible */
  isWidgetOpen: boolean;
}

/**
 * Hook for managing inline translation state
 *
 * Handles:
 * - Tracking which blocks have been translated
 * - Managing the translation widget visibility
 * - Applying translations to blocks
 */
export function useInlineTranslation() {
  const [state, setState] = useState<TranslationState>({
    translations: new Map(),
    activeTranslation: null,
    isWidgetOpen: false,
  });

  /**
   * Start translation for a selection
   */
  const startTranslation = useCallback((selection: TextSelection) => {
    setState((prev) => ({
      ...prev,
      activeTranslation: selection,
      isWidgetOpen: true,
    }));
  }, []);

  /**
   * Apply translation to a block
   */
  const applyTranslation = useCallback(
    (blockId: string, translation: string) => {
      setState((prev) => {
        const newTranslations = new Map(prev.translations);
        newTranslations.set(blockId, translation);

        return {
          ...prev,
          translations: newTranslations,
          activeTranslation: null,
          isWidgetOpen: false,
        };
      });
    },
    [],
  );

  /**
   * Remove translation from a block (revert to original)
   */
  const removeTranslation = useCallback((blockId: string) => {
    setState((prev) => {
      const newTranslations = new Map(prev.translations);
      newTranslations.delete(blockId);

      return {
        ...prev,
        translations: newTranslations,
      };
    });
  }, []);

  /**
   * Close translation widget
   */
  const closeWidget = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTranslation: null,
      isWidgetOpen: false,
    }));
  }, []);

  /**
   * Check if a block has been translated
   */
  const isTranslated = useCallback(
    (blockId: string) => {
      return state.translations.has(blockId);
    },
    [state.translations],
  );

  /**
   * Get translation for a block
   */
  const getTranslation = useCallback(
    (blockId: string) => {
      return state.translations.get(blockId);
    },
    [state.translations],
  );

  /**
   * Apply translations to a list of blocks
   * Returns blocks with translation data merged in
   */
  const applyTranslationsToBlocks = useCallback(
    (blocks: TextBlock[]): TextBlock[] => {
      return blocks.map((block) => {
        const translation = state.translations.get(block.id);
        if (translation) {
          return {
            ...block,
            translation,
            isTranslated: true,
          };
        }
        return block;
      });
    },
    [state.translations],
  );

  /**
   * Clear all translations
   */
  const clearAllTranslations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      translations: new Map(),
    }));
  }, []);

  return {
    // State
    activeTranslation: state.activeTranslation,
    isWidgetOpen: state.isWidgetOpen,
    translationsCount: state.translations.size,

    // Actions
    startTranslation,
    applyTranslation,
    removeTranslation,
    closeWidget,

    // Queries
    isTranslated,
    getTranslation,
    applyTranslationsToBlocks,
    clearAllTranslations,
  };
}

export type UseInlineTranslationReturn = ReturnType<
  typeof useInlineTranslation
>;
