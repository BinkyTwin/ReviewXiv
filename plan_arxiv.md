# Plan: Refactoring ReviewXiv pour Support arXiv HTML

## Objectif
Permettre l'import de papers via lien arXiv, récupérer le HTML pour avoir une structure sémantique riche, tout en conservant TOUTES les fonctionnalités existantes (highlights, citations, traductions, notes, chat IA).

---

## Analyse de Faisabilité

### Sources HTML Disponibles
| Source | URL Pattern | Couverture |
|--------|-------------|------------|
| arXiv officiel | `arxiv.org/html/{id}` | 100% post-Dec 2023 |
| ar5iv | `ar5iv.labs.arxiv.org/html/{id}` | ~97% du corpus |

### Avantages vs PDF
- **Citations précises** : Offsets caractères natifs (pas d'extraction fragile)
- **Structure sémantique** : `<section>`, `<figure>`, `<math>`
- **Équations** : MathML + LaTeX source
- **Références** : Liens cliquables vers bibliographie
- **Mobile** : Responsive natif
- **Pas d'OCR** : Texte déjà disponible

---

## Architecture Proposée

### Dual-Format Support
```
papers.format: "pdf" | "html"
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   PDF Viewer          HTML Viewer
   (existant)          (nouveau)
        │                   │
        └─────────┬─────────┘
                  ▼
        Unified Highlight/Citation System
        (adapté pour les deux formats)
```

### Nouvelle Table: `paper_sections` (pour HTML)
```sql
CREATE TABLE paper_sections (
  id UUID PRIMARY KEY,
  paper_id UUID REFERENCES papers(id),
  section_index INT,           -- Ordre séquentiel
  section_id TEXT,             -- ID DOM (ex: "S3.SS1")
  title TEXT,
  level INT,                   -- H1=1, H2=2, etc.
  text_content TEXT,
  html_content TEXT,           -- HTML brut de la section
  parent_section_id UUID,      -- Hiérarchie
  created_at TIMESTAMPTZ
);
```

### Nouvelle Table: `paper_html_cache` (stockage complet)
```sql
CREATE TABLE paper_html_cache (
  id UUID PRIMARY KEY,
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  arxiv_id TEXT NOT NULL,
  raw_html TEXT NOT NULL,      -- HTML complet stocké
  source_url TEXT,             -- URL d'origine (arxiv ou ar5iv)
  fetched_at TIMESTAMPTZ,
  html_hash TEXT,              -- Hash pour détecter changements
  UNIQUE(paper_id)
);
```

### Extensions Paper Type
```typescript
interface Paper {
  // Existant...
  format: "pdf" | "html";      // NOUVEAU
  arxiv_id?: string;           // Existant mais requis pour HTML
  source_url?: string;         // URL arXiv/ar5iv
  html_cached?: boolean;       // HTML stocké localement?
}
```

---

## Fonctionnalités à Préserver

| Feature | PDF (actuel) | HTML (nouveau) |
|---------|--------------|----------------|
| **Highlights** | Rects normalisés + page_number | DOM Range API + section_id |
| **Citations** | page + start/end offsets | section_id + start/end offsets |
| **Traductions** | Overlay sur page | Overlay sur section |
| **Notes** | Liées à page_number | Liées à section_id |
| **Chat IA** | RAG par chunks/pages | RAG par chunks/sections |
| **Navigation** | Page numbers | Table of contents sémantique |

---

## Plan d'Implémentation

### Phase 1: Infrastructure Backend (API Routes)
**Fichiers à créer:**
- `src/app/api/arxiv/fetch/route.ts` - Proxy pour récupérer HTML
- `src/app/api/arxiv/parse/route.ts` - Parser HTML → structure
- `src/app/api/papers/import-arxiv/route.ts` - Import complet

**Logique de fetch:**
```typescript
// Ordre de tentative
1. arxiv.org/html/{id}     // Officiel
2. ar5iv.labs.arxiv.org/html/{id}  // Fallback
3. Erreur si aucun disponible
```

### Phase 2: Parser HTML & Extraction
**Fichiers à créer:**
- `src/lib/arxiv/fetcher.ts` - Client fetch avec retry
- `src/lib/arxiv/parser.ts` - Extraction Cheerio
- `src/lib/arxiv/types.ts` - Types arXiv

**Données à extraire:**
```typescript
interface ArxivParsedPaper {
  metadata: {
    title: string;
    authors: string[];
    abstract: string;
    categories: string[];
    arxivId: string;
    submittedDate: string;
  };
  sections: ArxivSection[];
  figures: ArxivFigure[];
  equations: ArxivEquation[];
  references: ArxivReference[];
  rawHtml: string;
}
```

### Phase 3: HTML Viewer Component
**Fichiers à créer:**
- `src/components/reader/HtmlViewer.tsx` - Viewer principal
- `src/components/reader/HtmlHighlightLayer.tsx` - Overlay highlights
- `src/components/reader/HtmlSelectionTip.tsx` - Menu sélection
- `src/components/reader/TableOfContents.tsx` - Navigation sections

**Caractéristiques:**
- Rendu HTML sanitizé (DOMPurify)
- Sélection texte avec Range API
- Highlights via CSS custom properties
- Scroll-to-section navigation
- Support MathML/KaTeX pour équations

### Phase 4: Adaptation Highlights & Citations
**Fichiers à modifier:**
- `src/types/highlight.ts` - Ajouter format + sectionId
- `src/app/api/highlights/route.ts` - Support dual format
- `src/lib/citations/validator.ts` - Validation HTML
- `src/lib/highlight-renderer.ts` - Rendu HTML

**Nouveau format highlight HTML:**
```typescript
interface HtmlHighlight {
  id: string;
  paperId: string;
  format: "html";
  sectionId: string;           // ID de la section
  startOffset: number;         // Offset dans section.text_content
  endOffset: number;
  selectedText: string;
  color: HighlightColor;
  // Pas de rects - calculés dynamiquement via Range API
}
```

### Phase 5: Chunking & RAG pour HTML
**Fichiers à modifier:**
- `src/lib/pdf/parser.ts` → `src/lib/content/parser.ts`
- `src/app/api/embeddings/generate/route.ts`

**Stratégie chunking HTML:**
- Chunks sémantiques par paragraphe/section
- Préserver frontières DOM
- Inclure context (section title) dans chaque chunk

### Phase 6: UI Integration
**Fichiers à modifier:**
- `src/app/paper/[id]/page.tsx` - Détection format
- `src/app/paper/[id]/PaperReader.tsx` - Switch viewer
- `src/app/library/page.tsx` - Import arXiv button
- `src/components/upload/PaperUploader.tsx` - Mode URL

**Nouveau flow utilisateur:**
```
1. User entre URL arXiv (arxiv.org/abs/2401.12345)
2. App extrait l'ID (2401.12345)
3. Fetch HTML via API proxy
4. Parse et stocke sections
5. Affiche dans HtmlViewer
6. Toutes features disponibles
```

---

## Migrations Base de Données

```sql
-- Migration 1: Extend papers table
ALTER TABLE papers
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS html_cached BOOLEAN DEFAULT FALSE;

-- Migration 2: Create paper_html_cache (stockage HTML complet)
CREATE TABLE IF NOT EXISTS paper_html_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  arxiv_id TEXT NOT NULL,
  raw_html TEXT NOT NULL,
  source_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  html_hash TEXT,
  UNIQUE(paper_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_html_cache_arxiv_id ON paper_html_cache(arxiv_id);

-- Migration 3: Create paper_sections
CREATE TABLE IF NOT EXISTS paper_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  section_index INT NOT NULL,
  section_id TEXT,
  title TEXT,
  level INT,
  text_content TEXT NOT NULL,
  html_content TEXT,
  parent_section_id UUID REFERENCES paper_sections(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_sections_paper_id ON paper_sections(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_sections_section_id ON paper_sections(section_id);

-- Migration 4: Extend highlights for HTML
ALTER TABLE highlights
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Migration 5: Extend inline_translations for HTML
ALTER TABLE inline_translations
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Migration 6: Extend chunks for HTML semantic chunking
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS section_id TEXT,
ADD COLUMN IF NOT EXISTS chunk_strategy TEXT DEFAULT 'character';
```

---

## Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| HTML non disponible (~3%) | Faible | Moyen | Fallback PDF automatique |
| Rendu équations cassé | Moyen | Faible | KaTeX fallback |
| CORS blocking | Faible | Moyen | Proxy server-side (déjà prévu) |
| Performance gros HTML | Faible | Moyen | Lazy loading sections |
| Sélection texte imprécise | Moyen | Moyen | Range API + validation |

---

## Décisions Prises

1. **Stockage HTML**: Cache DB complet - Stocker le HTML entier en base pour accès offline et performance
2. **Fallback PDF**: Erreur + lien manuel - Afficher erreur avec lien vers PDF que l'user peut uploader manuellement
3. **Priorité**: Tout en parallèle - Implémenter toutes les features dès le début (highlights, citations, traductions, chat)

---

## Vérification (Test Plan)

### Tests Manuels
1. Import paper via URL arXiv récent (post-Dec 2023)
2. Import paper ancien via ar5iv
3. Créer highlight sur texte
4. Créer highlight sur équation
5. Poser question au chat avec citation
6. Vérifier citation cliquable scroll vers section
7. Traduire sélection
8. Ajouter note
9. Test mobile responsive
10. Test paper sans HTML (fallback)

### Tests Automatisés
- Unit tests parser HTML
- Integration tests API routes
- E2E test flow import → highlight → chat

---

## Fichiers à Créer (15 nouveaux)
| Fichier | Description |
|---------|-------------|
| `src/lib/arxiv/fetcher.ts` | Client HTTP avec retry + fallback ar5iv |
| `src/lib/arxiv/parser.ts` | Parser Cheerio extraction structure |
| `src/lib/arxiv/types.ts` | Types ArxivPaper, ArxivSection, etc. |
| `src/app/api/arxiv/fetch/route.ts` | Proxy fetch HTML |
| `src/app/api/arxiv/parse/route.ts` | Parse HTML → JSON |
| `src/app/api/papers/import-arxiv/route.ts` | Import complet arXiv |
| `src/components/reader/HtmlViewer.tsx` | Viewer HTML principal |
| `src/components/reader/HtmlHighlightLayer.tsx` | Overlay highlights |
| `src/components/reader/HtmlSelectionTip.tsx` | Menu sélection |
| `src/components/reader/HtmlTranslationLayer.tsx` | Overlay traductions |
| `src/components/reader/TableOfContents.tsx` | Navigation sections |
| `src/components/reader/HtmlCitationFlash.tsx` | Animation citation |
| `src/hooks/useHtmlHighlights.ts` | Hook highlights HTML |
| `src/hooks/useHtmlSelection.ts` | Hook sélection Range API |
| `supabase/migrations/xxx_add_html_support.sql` | Migration DB |

## Fichiers à Modifier (10 existants)
| Fichier | Modification |
|---------|--------------|
| `src/types/paper.ts` | Ajouter format, html_cached |
| `src/types/highlight.ts` | Ajouter format, sectionId |
| `src/app/api/highlights/route.ts` | Support dual format |
| `src/app/api/chat/route.ts` | Context HTML sections |
| `src/lib/citations/validator.ts` | Validation HTML |
| `src/app/paper/[id]/page.tsx` | Détection format |
| `src/app/paper/[id]/PaperReader.tsx` | Switch viewer |
| `src/app/library/page.tsx` | Bouton import arXiv |
| `src/components/upload/PaperUploader.tsx` | Mode URL |
| `src/lib/rag/context-builder.ts` | Support sections HTML |

**Total**: 25 fichiers (15 nouveaux + 10 modifiés)
