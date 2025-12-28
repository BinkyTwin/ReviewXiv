# Plan: Intégration react-pdf-highlighter dans DeepRead

> Date: 2025-12-28
> Branch: `feature/react-pdf-highlighter` (à créer depuis `feature/smart-pdf-viewer`)
> Status: PLANIFICATION

## Objectif

Remplacer le SmartPDFViewer actuel par [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) pour avoir:
- Sélection de texte avec popup (Tip) pour ajouter highlights/commentaires
- Sidebar avec liste des highlights et navigation (clic → scroll to highlight)
- Intégration avec le système de chat LLM (citations cliquables → scroll + flash)

**Démo de référence**: https://agentcooper.github.io/react-pdf-highlighter/

---

## Nouvelle Structure

```
src/components/pdf-highlighter/
├── index.ts                      # Exports publics
├── types.ts                      # Types pont react-pdf-highlighter <-> DeepRead
├── PDFHighlighterViewer.tsx      # Wrapper principal
├── HighlightTip.tsx              # Popup création (H, A, T shortcuts)
├── HighlightPopup.tsx            # Popup au survol
├── HighlightRenderer.tsx         # Rendu custom avec couleurs DeepRead
├── CitationFlash.tsx             # Effet flash pour citations chat
├── hooks/
│   ├── useHighlighterRef.ts      # Gestion scrollViewerTo
│   └── useCitationNavigation.ts  # Navigation depuis citations
└── utils/
    ├── position-converter.ts     # ScaledPosition <-> HighlightRect
    └── highlight-adapter.ts      # Supabase Highlight <-> IHighlight
```

---

## Étapes d'Implémentation

### Phase 1: Setup et Types ✅
- [x] Créer branche `feature/react-pdf-highlighter` depuis `feature/smart-pdf-viewer`
- [x] `npm install react-pdf-highlighter`
- [x] Créer structure `/src/components/pdf-highlighter/`
- [x] Créer `types.ts` avec `DeepReadHighlight`, `PDFHighlighterViewerProps`
- [x] Créer `utils/position-converter.ts` (ScaledPosition ↔ HighlightRect)
- [x] Créer `utils/highlight-adapter.ts` (Supabase ↔ react-pdf-highlighter)

### Phase 2: Composant Principal ✅
- [x] Créer `PDFHighlighterViewer.tsx` avec PdfLoader + PdfHighlighter
- [x] Intégrer conversion highlights Supabase existants
- [x] Ajouter gestion scroll (scrollRef)
- [x] Dynamic import avec `ssr: false` pour Next.js

### Phase 3: UI de Sélection ✅
- [x] Créer `HighlightTip.tsx` (basé sur SelectionToolbar)
  - Bouton Highlight avec color picker
  - Bouton Ask (raccourci A)
  - Bouton Translate (raccourci T)
  - Raccourci Escape pour fermer
- [x] Intégrer `onSelectionFinished`
- [x] Ajouter callbacks Ask/Translate

### Phase 4: Rendu Personnalisé (simplifié)
- [x] Utiliser rendu par défaut de react-pdf-highlighter
- [x] Popup basique au hover (HighlightPopup)
- [ ] Améliorer couleurs DeepRead (future iteration)

### Phase 5: Citations et Navigation ✅
- [x] Créer `CitationFlash.tsx` avec animation orange
- [x] Adapter citation → rects (réutiliser `offsetsToRects`)
- [x] Intégrer avec ChatPanel (onCitationClick → scroll + flash)

### Phase 6: Intégration PaperReader ✅
- [x] Modifier `PaperReader.tsx` pour utiliser `PDFHighlighterViewer`
- [x] Ajouter flag `?viewer=v3` pour le nouveau viewer
- [x] Connecter handlers (highlight create/click/delete)
- [x] Connecter Ask/Translate callbacks
- [x] Connecter avec HighlightsPanel sidebar

### Phase 7: Cleanup (future)
- [ ] Supprimer anciens fichiers pdf-v2/ (SmartPDFViewer, PDFPage, layers/)
- [ ] Mettre à jour imports
- [ ] Mettre à jour CHANGELOG.md

---

## Fichiers Critiques À Modifier

| Fichier | Action |
|---------|--------|
| `src/app/paper/[id]/PaperReader.tsx` | Adapter pour nouveau viewer |
| `src/types/highlight.ts` | Préserver, ajouter types si nécessaire |
| `src/types/citation.ts` | Préserver pour navigation chat |
| `src/lib/highlight-renderer.ts` | Réutiliser `offsetsToRects` |
| `src/app/globals.css` | Réutiliser tokens highlight-*, citation-flash |

---

## Fichiers À Supprimer

```
src/components/pdf-v2/
├── SmartPDFViewer.tsx     # Remplacé par PDFHighlighterViewer
├── PDFViewer.tsx          # Remplacé
├── PDFPage.tsx            # Remplacé
├── SelectionToolbar.tsx   # Remplacé par HighlightTip
├── SmartTextLayer.tsx     # Déjà supprimé
├── TextBlock.tsx          # Déjà supprimé
└── layers/                # Tout le dossier
```

---

## Types Clés

### DeepReadHighlight (extends IHighlight)

```typescript
interface DeepReadHighlight extends IHighlight {
  color: HighlightColor;       // yellow, green, blue, red, purple
  startOffset?: number;        // Pour rétrocompatibilité citations
  endOffset?: number;
  note?: string;
  paperId: string;
}
```

### Conversion de Positions

```typescript
// react-pdf-highlighter: coordonnées absolues pixels
interface Scaled { x1, y1, x2, y2, width, height, pageNumber }

// DeepRead: coordonnées relatives 0-1
interface HighlightRect { x, y, width, height }

// Conversion au runtime, pas de migration DB nécessaire
```

---

## Points d'Attention

1. **Conversion de positions**:
   - DeepRead: `HighlightRect { x, y, width, height }` (0-1 relatif)
   - react-pdf-highlighter: `Scaled { x1, y1, x2, y2 }` (pixels)
   - Conversion au runtime, pas de migration DB

2. **Citations LLM**:
   - Gardent format `{ page, start, end, quote }` avec offsets
   - Conversion vers rects visuels via `offsetsToRects` existant

3. **SSR Next.js**:
   - `PdfLoader` doit être chargé avec `dynamic({ ssr: false })`

4. **Styles**:
   - Réutiliser classes `highlight-yellow`, `highlight-green`, etc.
   - Réutiliser animation `citation-flash`

---

## Architecture Finale

```
PaperReader.tsx
  ├── PDFHighlighterViewer (nouveau)
  │     ├── PdfLoader → PdfHighlighter
  │     │     ├── HighlightRenderer (chaque highlight)
  │     │     ├── HighlightTip (après sélection)
  │     │     └── HighlightPopup (au hover)
  │     └── CitationFlash (overlay citations)
  │
  ├── ChatPanel (inchangé)
  │     └── citations → onCitationClick → scroll + flash
  │
  └── HighlightsPanel (sidebar, inchangé)
        └── onHighlightClick → scroll vers highlight
```

---

## Références

- [react-pdf-highlighter GitHub](https://github.com/agentcooper/react-pdf-highlighter)
- [Démo interactive](https://agentcooper.github.io/react-pdf-highlighter/)
- [Exemple App.tsx](https://github.com/agentcooper/react-pdf-highlighter/blob/main/example/src/App.tsx)
