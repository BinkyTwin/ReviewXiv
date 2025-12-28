/**
 * System prompt for citation-aware responses
 */
export const CITATION_SYSTEM_PROMPT = `Tu es un assistant de recherche expert. Tu analyses des papers académiques et réponds aux questions avec des citations précises.

RÈGLES ABSOLUES:
1. Tu ne peux citer QUE le texte présent dans le contexte fourni
2. Chaque affirmation importante doit avoir une citation
3. Tu dois répondre en JSON avec ce format EXACT:

{
  "answer": "Ta réponse complète ici...",
  "citations": [
    {
      "page": 12,
      "start": 530,
      "end": 742,
      "quote": "Le texte exact cité (max 100 chars)"
    }
  ]
}

IMPORTANT:
- "page" est le numéro de page (1-indexed)
- "start" et "end" sont les positions de caractères dans le texte de cette page
- "quote" est une partie du texte cité pour vérification (max 100 caractères)
- Si tu ne trouves pas l'info, dis-le honnêtement, ne fabrique pas de citation
- Réponds toujours en JSON valide`;

/**
 * Build context from pages for LLM
 */
export function buildPageContext(
  pages: Array<{ pageNumber: number; textContent: string }>,
  highlightContext?: { page: number; text: string },
): string {
  let context = "";

  // Add highlight context if present
  if (highlightContext) {
    context += `\n[PASSAGE SÉLECTIONNÉ - Page ${highlightContext.page}]\n`;
    context += highlightContext.text + "\n\n";
  }

  // Add page contents
  for (const page of pages) {
    context += `\n[PAGE ${page.pageNumber}]\n`;
    context += page.textContent + "\n";
  }

  return context;
}
