# Plan: Smart PDF Viewer v2 - OCR LLM & Inline Translation

## Goal
Refondre le visualisateur PDF pour une interaction fluide avec le texte :
1. Highlighting precis et bien centre
2. Traduction inline (pas de popup, le texte change directement)
3. Integration OCR LLM (olmOCR2 via LMStudio local)
4. Preservation du layout original

## Current State

### Architecture actuelle
- **PDFViewer.tsx** (507 lignes) : Canvas PDF.js + text layer invisible
- **Text layer** : Spans transparents pour selection uniquement
- **Highlighting** : offsetsToRects() → rectangles overlay
- **Traduction** : TranslationModal.tsx (popup)

### Problemes identifies
1. Text layer invisible = highlighting approximatif (coords PDF.js imprécises)
2. Interactions via popups = UX fragmentee
3. Pas de preservation du layout intelligent

---

## Approach: "Smart Text Layer"

### Concept
Remplacer le dual-layer (canvas + invisible text) par un **hybrid rendering** :

```
┌─────────────────────────────────────────┐
│ [PDF Canvas - Background/Images only]   │  ← Optionnel, pour figures
├─────────────────────────────────────────┤
│ [Smart Text Layer - HTML/CSS natif]     │  ← Texte rendu en HTML
│   - Spans visibles et selectionnables   │
│   - Positions precises via OCR LLM      │
│   - Traduction inline (swap content)    │
│   - Highlights CSS natifs               │
└─────────────────────────────────────────┘
```

### Architecture proposee

```
SmartPDFViewer/
├── components/
│   ├── SmartTextLayer.tsx      # Rendu HTML du texte OCR
│   ├── TextBlock.tsx           # Bloc de texte interactif
│   ├── InlineTranslation.tsx   # Composant de traduction inline
│   └── SelectionToolbar.tsx    # Toolbar contextuelle (remplace popover)
├── hooks/
│   ├── useOCRExtraction.ts     # Hook pour appeler olmOCR
│   ├── useTextSelection.ts     # Gestion selection native
│   └── useInlineTranslation.ts # State traduction par bloc
└── lib/
    ├── ocr/
    │   ├── olmocr-client.ts    # Client LMStudio API
    │   └── layout-parser.ts    # Parse markdown OCR → blocs positionnes
    └── translation/
        └── inline-swap.ts      # Logique de swap texte/traduction
```

---

## Phase 1: OCR LLM Integration (olmOCR2 via LMStudio)

### 1.1 Client olmOCR pour LMStudio
- API endpoint: `http://localhost:1234/v1`
- Model: `allenai/olmocr-2-7b` (GGUF)
- Input: Image de page PDF (1024px longest side)
- Output: Markdown structure avec layout

```typescript
// src/lib/ocr/olmocr-client.ts
interface OlmOCRRequest {
  image: string;       // Base64 ou URL
  metadata?: {
    pageNumber: number;
    width: number;
    height: number;
  };
}

interface OlmOCRResponse {
  markdown: string;    // Texte structure en markdown
  blocks: TextBlock[]; // Blocs positionnes (si dispo)
}
```

### 1.2 Extraction de page en image
- Utiliser PDF.js canvas rendering
- Resize au plus grand cote = 1024px
- Encoder en base64 pour l'API

### 1.3 Parser le output Markdown
- Detecter headings, paragraphes, listes, tables
- Mapper vers des blocs avec coordonnees estimees
- Fallback sur PDF.js text items si OCR echoue

---

## Phase 2: Smart Text Layer

### 2.1 TextBlock Component
```typescript
interface TextBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'caption';
  content: string;
  position: { x: number; y: number; width: number; height: number }; // 0-1 normalized
  translation?: string;
  isTranslated: boolean;
}
```

### 2.2 SmartTextLayer Component
- Rend les TextBlocks comme des divs positionnés
- Support highlighting natif CSS (`::selection`, `mark`)
- Click-to-select avec `user-select: text`

### 2.3 Modes d'affichage
1. **Original** : Texte source avec layout preserve
2. **Translated** : Texte traduit inline
3. **Side-by-side** : Original + traduction (pour les longs blocs)

---

## Phase 3: Inline Translation

### 3.1 Selection → Translation Flow
```
User selects text → SelectionToolbar appears (inline, pas popup)
                 → Click "Traduire"
                 → Texte selectionne devient [Loading...]
                 → Texte swap vers traduction
                 → Toggle button pour revenir a l'original
```

### 3.2 InlineTranslation Component
```tsx
<TextBlock>
  {isTranslated ? (
    <span className="translated" onClick={toggleBack}>
      {translation}
      <button className="revert-btn">↩</button>
    </span>
  ) : (
    <span>{originalText}</span>
  )}
</TextBlock>
```

### 3.3 Preservation du Layout
- Le bloc traduit garde les memes dimensions
- Font-size ajuste si necessaire (text overflow)
- Animation smooth de transition

---

## Phase 4: Improved Highlighting

### 4.1 CSS-Native Highlights
```css
.text-block .highlight-yellow { background: hsl(var(--highlight-yellow) / 0.35); }
.text-block mark { /* native selection highlight */ }
```

### 4.2 Precise Selection
- Selection via window.getSelection() sur le Smart Text Layer
- Pas besoin de calculs d'offsets complexes
- Les offsets sont natifs au DOM

### 4.3 Persistent Highlights
- Stocker les ranges DOM serialisees
- Restaurer via Range API au chargement

---

## Implementation Steps

### Step 1: Setup branche + infrastructure
- [ ] Creer branche `feature/smart-pdf-viewer`
- [ ] Creer structure dossiers
- [ ] Installer deps (si necessaire)

### Step 2: olmOCR Client
- [ ] Creer `src/lib/ocr/olmocr-client.ts`
- [ ] Tester connexion LMStudio local
- [ ] Creer `src/lib/ocr/page-to-image.ts` (PDF page → base64)
- [ ] Creer `src/lib/ocr/layout-parser.ts` (markdown → blocks)

### Step 3: Smart Text Layer
- [ ] Creer `src/components/pdf-v2/SmartTextLayer.tsx`
- [ ] Creer `src/components/pdf-v2/TextBlock.tsx`
- [ ] Integrer dans un nouveau `SmartPDFViewer.tsx`
- [ ] Tester rendu basique

### Step 4: Selection & Toolbar
- [ ] Creer `src/hooks/useTextSelection.ts`
- [ ] Creer `src/components/pdf-v2/SelectionToolbar.tsx`
- [ ] Remplacer le popover par toolbar inline

### Step 5: Inline Translation
- [ ] Creer `src/hooks/useInlineTranslation.ts`
- [ ] Creer `src/components/pdf-v2/InlineTranslation.tsx`
- [ ] Integrer dans TextBlock
- [ ] Tester swap texte

### Step 6: Improved Highlighting
- [ ] Adapter `offsetsToRects` pour les nouveaux blocs
- [ ] CSS native highlights
- [ ] Tester highlights persistants

### Step 7: Integration
- [ ] Remplacer PDFViewer par SmartPDFViewer dans PaperReader
- [ ] Migration des highlights existants
- [ ] Tests E2E

---

## Technical Decisions

### Pourquoi olmOCR2 via LMStudio?
1. **Local** : Pas de couts API, data privacy
2. **Qualite** : 75.5% accuracy, meilleur que PDF.js sur layouts complexes
3. **Markdown** : Output structure facile a parser
4. **Disponible** : Tu l'as deja sur LMStudio

### Fallback Strategy
```
1. Essayer olmOCR2 local
2. Si echoue → Fallback PDF.js text items
3. Si PDF.js echoue → OCR Tesseract.js (deja prevu)
```

### Compatibilite
- Le nouveau viewer sera en `/components/pdf-v2/`
- L'ancien reste en `/components/pdf/`
- Feature flag pour basculer

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| olmOCR2 lent sur CPU | Cache des resultats OCR, processing background |
| Layout OCR imprecis | Fallback PDF.js coords, ajustement manuel |
| LMStudio pas disponible | Detection au runtime, fallback auto |
| Migration highlights | Script de migration offsets → DOM ranges |

---

## Acceptance Criteria

- [ ] Texte rendu en HTML natif (pas canvas)
- [ ] Selection fluide sans lag
- [ ] Traduction inline sans popup
- [ ] Highlighting precis sur le texte
- [ ] Layout preserve (colonnes, paragraphes)
- [ ] Fallback si olmOCR indisponible
- [ ] Performance acceptable (<3s par page avec OCR)

---

## Decisions prises

1. **OCR au load ou on-demand?**
   - **Decision**: Au chargement complet - OCR toutes les pages au premier load
   - Necessite: Progress bar, queue de traitement, caching

2. **Stocker le markdown OCR?**
   - **Decision**: Oui, dans `paper_pages.ocr_markdown`

3. **Garder le canvas PDF pour les images?**
   - **Decision**: Oui, semi-transparent en background pour figures/graphs

4. **Layout multi-colonnes?**
   - **Decision**: Preserver avec CSS columns/grid
   - L'OCR doit detecter la structure (colonnes, paragraphes, figures)

---

## Sources

- [olmOCR - Allen AI](https://olmocr.allenai.org/)
- [olmOCR on LMStudio](https://jonathansoma.com/words/olmocr-on-macos-with-lm-studio.html)
- [lmstudio-community/olmOCR-7B GGUF](https://huggingface.co/lmstudio-community/olmOCR-7B-0225-preview-GGUF)
- [Mistral OCR 3](https://mistral.ai/news/mistral-ocr-3)
- [PDF.js Text Layer](https://blog.react-pdf.dev/understanding-pdfjs-layers-and-how-to-use-them-in-reactjs)
