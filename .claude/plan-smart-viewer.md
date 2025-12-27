# Plan: Smart PDF Viewer - Niveau Alphaxiv

> Date: 2025-12-27
> Branch: feature/smart-pdf-viewer
> Status: Proposition

## Inspiration: Alphaxiv

[Alphaxiv](https://www.alphaxiv.org/) offre:
- Surlignage de n'importe quelle section du papier
- "@" pour referencer d'autres papiers et comparer
- Commentaires in-line sur les sections surlignees
- Chat IA directement sur le document
- Lecture en plusieurs langues
- Format PDF original preserve

---

## Problemes Actuels Identifies

### 1. Le Surlignage Ne Fonctionne Pas (CRITIQUE)

**Cause Racine**: Incompatibilite architecturale entre v1 et v2

| Viewer | Source de donnees | Systeme de highlight |
|--------|-------------------|---------------------|
| PDFViewer (v1) | pdf.js TextItems | `offsetsToRects()` fonctionne |
| SmartPDFViewer (v2) | Mistral OCR markdown | **Aucun TextItem disponible** |

**Bugs specifiques**:
- `TextBlock.tsx:245-255`: Classes CSS incorrectes (`bg-highlight-yellow/35` au lieu de `highlight-yellow`)
- `SmartTextLayer.tsx:43`: `highlights` prop jamais peuplee, toujours `Map()` vide
- `SmartTextLayer.tsx:50`: `hoveredBlockId` declare mais jamais mis a jour

### 2. Traduction UX Incorrecte

**Attendu**: Remplacement inline du texte (comme Google Translate)
**Actuel**: Widget separe avec bouton "Apply"

**Fichier concerne**: `InlineTranslation.tsx` - Affiche un widget flottant separe au lieu de remplacer le texte directement.

### 3. Pas de Systeme d'Annotation

- Les highlights existent mais ne peuvent pas avoir de notes attachees
- Pas de commentaires in-line comme Alphaxiv
- Pas de sidebar d'annotations

### 4. Selection UX Basique

- Selection navigateur standard sans feedback visuel ameliore
- Toolbar basique sans raccourcis clavier visibles
- Pas de snap sur les limites de mots

---

## Architecture Proposee

### Structure des Couches (Z-Index)

```
+60  SelectionOverlay      Selection active
+50  CitationLayer         Flash AI temporaire
+40  TranslationLayer      Overlays de traduction
+30  AnnotationLayer       Marqueurs de commentaires
+20  HighlightLayer        Surlignages persistants
+10  TextLayer             Selection de texte
 0   CanvasLayer           Rendu PDF
```

### Hierarchie des Composants

```
SmartReaderShell
|-- ReaderToolbar
|-- DocumentViewport
|   |-- PageContainer (par page)
|   |   |-- CanvasLayer
|   |   |-- TextLayer
|   |   |-- HighlightLayer (REVISED)
|   |   |-- AnnotationLayer (NEW)
|   |   |-- TranslationLayer (NEW)
|   |   |-- CitationLayer
|   |-- SelectionOverlay
|-- SelectionContextBar (IMPROVED)
|-- AnnotationSidebar (NEW)
|-- TranslationTooltip (REVISED)
```

### Structure de Fichiers Recommandee

```
src/components/reader/
  |-- SmartReaderShell.tsx
  |-- ReaderToolbar.tsx
  |-- DocumentViewport.tsx
  |-- PageContainer.tsx
  |-- layers/
  |   |-- TextLayer.tsx
  |   |-- HighlightLayer.tsx      # Revu
  |   |-- AnnotationLayer.tsx     # Nouveau
  |   |-- TranslationLayer.tsx    # Nouveau
  |   |-- CitationLayer.tsx
  |-- selection/
  |   |-- SelectionContextBar.tsx
  |   |-- SelectionOverlay.tsx
  |-- translation/
  |   |-- InlineTranslationWidget.tsx
  |   |-- TranslationToggle.tsx
  |-- annotations/
  |   |-- AnnotationPopover.tsx
  |   |-- AnnotationMarker.tsx
  |   |-- AnnotationSidebar.tsx
  |-- hooks/
  |   |-- useSelection.ts
  |   |-- useHighlights.ts
  |   |-- useTranslations.ts
  |   |-- useAnnotations.ts
```

---

## Solution: Surlignage Qui Fonctionne

### Approche Technique

**Probleme**: Position `fixed` cause un decalage au scroll.
**Solution**: Position `absolute` dans `PageContainer` avec coordonnees en pourcentage.

```tsx
// Dans PageContainer
<div className="relative" style={{ width, height }}>
  <canvas />
  <div className="absolute inset-0 pointer-events-none">
    {highlights.map(h => (
      h.rects.map(rect => (
        <div
          style={{
            position: 'absolute',
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
          className={`highlight-${h.color} pointer-events-auto cursor-pointer`}
          onClick={() => onHighlightClick(h.id)}
        />
      ))
    ))}
  </div>
</div>
```

### Corrections CSS Requises

```diff
// TextBlock.tsx:245-255
const colorMap: Record<string, string> = {
-  yellow: "bg-highlight-yellow/35",
+  yellow: "highlight-yellow",
-  green: "bg-highlight-green/35",
+  green: "highlight-green",
  // etc.
};
```

### Pour SmartPDFViewer (v2)

Option A: **Extraire TextItems du markdown Mistral**
- Parser le markdown pour extraire les blocs de texte avec positions
- Convertir `TextBlock.position` en offsets de caracteres
- Construire un tableau `TextItem[]` compatible

Option B: **Approche hybride** (Recommandee)
- Utiliser pdf.js pour l'extraction de texte (TextItems + offsets)
- Utiliser Mistral OCR uniquement pour les PDFs scannes
- Rendre avec des TextBlocks positionnes (pas markdown brut)

---

## Solution: Traduction Inline

### Flow Utilisateur

```
1. Selectionner texte
2. Cliquer "Traduire"
3. Widget apparait avec traduction
4. Cliquer "Appliquer Inline"
   -> Overlay couvre le texte original
   -> Texte traduit affiche
   -> Bouton toggle apparait
5. Cliquer toggle pour basculer original/traduit
```

### Design de l'Overlay

```
AVANT (original):
+------------------------------------------+
| This is the original text in English.    |
+------------------------------------------+

APRES (Apply Inline):
+------------------------------------------+
| Ceci est le texte original en anglais.   |
|                                    [EN]  | <- Bouton toggle
+------------------------------------------+
```

### Specifications

- Background: blanc (correspond a la page)
- Font: correspond au style du texte original
- Bouton toggle: 24px, subtil, apparait au hover
- Border: aucune (seamless avec la page)
- Transition: 150ms fade entre les etats

### Modele de Donnees

```typescript
interface InlineTranslation {
  id: string;
  paperId: string;
  pageNumber: number;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  startOffset: number;
  endOffset: number;
  rects: HighlightRect[];
  isActive: boolean; // true = affiche traduction
  createdAt: string;
}
```

---

## Solution: Systeme d'Annotations

### Concept

Chaque highlight peut avoir des annotations/commentaires attaches.

### Flow Utilisateur

```
1. Selectionner texte
2. Cliquer "Commenter" dans la toolbar
3. Popover d'annotation apparait:
   - Champ de texte
   - Selecteur de couleur (si nouveau highlight)
   - Boutons Save/Cancel
4. Save:
   - Cree le highlight si n'existe pas
   - Attache la note au highlight
   - Affiche le marqueur d'annotation
5. Voir commentaire:
   - Cliquer sur le marqueur
   - Ou voir dans la sidebar
```

### Design du Marqueur

```
Texte original [surligne] suite du texte [2]
                                          ^
                                       marqueur
```

**Specifications**:
- Taille: 16x16px cercle
- Couleur: correspond au highlight
- Position: bord droit du dernier rect
- Contenu: nombre de commentaires (si > 1) ou point
- Hover: scale 1.1, preview en tooltip

### Modele de Donnees

```typescript
interface Annotation {
  id: string;
  highlightId: string;
  content: string;
  richContent?: {
    type: 'text' | 'markdown';
    value: string;
  };
  parentId?: string; // Pour les reponses
  replies?: Annotation[];
  createdAt: string;
  updatedAt: string;
}
```

### Schema Database (Supabase)

```sql
-- Etendre la table highlights
ALTER TABLE highlights
ADD COLUMN annotation_count INTEGER DEFAULT 0;

-- Nouvelle table annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES annotations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nouvelle table traductions
CREATE TABLE inline_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  source_language VARCHAR(10),
  target_language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  rects JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inline_translations ENABLE ROW LEVEL SECURITY;
```

---

## Selection Context Bar Amelioree

### Design

```
+--------------------------------------------------+
| [H] Surligner v | [C] Commenter | [T] Traduire   |
| [A] Demander IA | [Copier]      | [X] Fermer     |
+--------------------------------------------------+
```

### Raccourcis Clavier

| Action | Raccourci | Resultat |
|--------|-----------|----------|
| Surligner | H | Ouvre color picker |
| Commenter | C | Cree highlight + ouvre annotation |
| Traduire | T | Affiche widget traduction |
| Demander IA | A | Envoie au chat |
| Copier | Cmd+C | Copie dans presse-papier |
| Fermer | Esc | Ferme la toolbar |

### Specifications Visuelles

- Background: `bg-card`
- Border: `border-border` (1px)
- Shadow: `shadow-xl`
- Border radius: `rounded-lg`
- Position: Au-dessus de la selection, centre
- Animation: `fade-in zoom-in` a l'apparition

---

## Phases d'Implementation

### Phase 1: Corriger le Surlignage (Priorite CRITIQUE)

**Duree estimee**: 1-2 jours

1. [ ] Corriger les classes CSS dans `TextBlock.tsx`
2. [ ] Deplacer le rendu des highlights dans `PageContainer`
3. [ ] Utiliser positionnement relatif (pourcentage)
4. [ ] Tester sur v1 et v2

### Phase 2: Selection UX Amelioree

**Duree estimee**: 1 jour

1. [ ] Implementer `SelectionContextBar` amelioree
2. [ ] Ajouter les raccourcis clavier
3. [ ] Ameliorer le calcul des offsets de selection

### Phase 3: Traduction Inline

**Duree estimee**: 2 jours

1. [ ] Creer composant `InlineTranslationOverlay`
2. [ ] Ajouter stockage des traductions
3. [ ] Implementer fonctionnalite toggle
4. [ ] Creer migration Supabase

### Phase 4: Systeme d'Annotations

**Duree estimee**: 2-3 jours

1. [ ] Creer modele de donnees Annotation
2. [ ] Construire composant `AnnotationPopover`
3. [ ] Ajouter marqueurs d'annotation aux highlights
4. [ ] Optionnel: Construire `AnnotationSidebar`
5. [ ] Creer migration Supabase

### Phase 5: Integration Citations IA

**Duree estimee**: 1 jour

1. [ ] Ameliorer animation de flash des citations
2. [ ] Ajouter option "Sauvegarder comme highlight"
3. [ ] Lier citations aux messages du chat

---

## Decision Requise: v1 vs v2 vs Hybride

### Option A: Garder v1 uniquement

| Avantages | Inconvenients |
|-----------|---------------|
| Surlignage fonctionne | Pas d'OCR pour PDFs scannes |
| Selection fonctionne | Rendu moins sophistique |
| Code mature | - |

### Option B: Garder v2 uniquement

| Avantages | Inconvenients |
|-----------|---------------|
| OCR pour PDFs scannes | Surlignage a refaire |
| Meilleur rendu layouts complexes | Selection a refaire |
| Markdown structure | Architecture incomplete |

### Option C: Hybride (Recommande)

| Avantages | Inconvenients |
|-----------|---------------|
| Meilleur des deux mondes | Plus de travail initial |
| pdf.js pour extraction texte | Complexite accrue |
| Mistral OCR pour scannes | - |
| Rendu avec TextBlocks positionnes | - |

**Recommandation**: Option C avec refactoring progressif.

---

## Code a Nettoyer

### Dead Code a Supprimer

| Fichier | Lignes | Probleme |
|---------|--------|----------|
| `SmartTextLayer.tsx` | 50, 208 | `hoveredBlockId` jamais update |
| `TextBlock.tsx` | 193 | `group-hover` sans classe `group` parent |

### Type Safety a Corriger

| Fichier | Lignes | Probleme |
|---------|--------|----------|
| `SmartTextLayer.tsx` | 95-96 | Assertions non-null sans verification |
| `SmartTextLayer.tsx` | 237-259 | Manque gestion d'erreur dans `calculateOffset()` |

### Constantes a Extraire

| Fichier | Lignes | Valeur |
|---------|--------|--------|
| `SmartPDFViewer.tsx` | 252-253 | A4 dimensions (794, 1123) |
| `SmartPDFViewer.tsx` | 411-412 | Padding et font size |

---

## Checklist Pre-Implementation

- [ ] Decision prise: v1, v2, ou hybride?
- [ ] Design system tokens verifies
- [ ] Schema database valide
- [ ] Priorites validees avec l'equipe
- [ ] Branch creee: `feature/smart-pdf-viewer`

---

## References

- [Alphaxiv](https://www.alphaxiv.org/) - Inspiration principale
- [Chrome Extension Alphaxiv](https://chromewebstore.google.com/detail/alphaxiv-understand-resea/liihfcjialakefgidmaadhajjikbjjab)
- [Hacker News Discussion](https://news.ycombinator.com/item?id=41478690)
