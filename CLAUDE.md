# CLAUDE.md - ReviewXiv AI Research Assistant

## Description
Application d'assistant de recherche IA pour analyser des documents académiques (PDF).
Objectif : importer un PDF, le lire, surligner, discuter, traduire, avec des citations précises (page + offsets).

## Rules (IMPORTANT)

1. **Always use Context7** when I need code generation, setup or configuration steps, or library/API documentation.
2. **Follow EPCP workflow** (Explore -> Plan -> Code -> Commit) for any feature or bug fix.
3. **Use Supabase MCP** for database operations - never write raw SQL without explaining first.
4. **Use GitHub CLI** (gh) for issues and PRs when available.
5. **TodoList** : regarde toujours `.claude/productbacklog.md`, si la tâche y figure, marque-la comme faite quand terminée. Si elle n'y figure pas, ajoute-la.
6. **CHANGELOG** : Après CHAQUE modification de code, mets à jour `CHANGELOG.md` avec le format approprié (FIX:, FEATURE:, REFACTOR:, etc.)

## Stack Technique
- **Frontend**: Next.js 14 (App Router), TypeScript strict, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Storage)
- **LLM**: OpenRouter API (multi-modèles)
- **PDF Processing**: pdf.js, react-pdf-highlighter
- **OCR**: Mistral OCR, Docling

## Commandes Essentielles

```bash
npm install          # Install dependencies
npm run dev          # Serveur dev (port 3000)
npm run build        # Build production
npm run lint         # ESLint
```

## Structure Projet

```
reviewxiv/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── chat/           # Chat IA avec citations
│   │   │   ├── highlights/     # Gestion highlights
│   │   │   ├── notes/          # Gestion notes
│   │   │   ├── papers/ingest/  # Ingestion PDF
│   │   │   ├── llm/            # Requêtes LLM
│   │   │   ├── mistral-ocr/    # OCR Mistral
│   │   │   ├── docling/        # OCR Docling
│   │   │   ├── translate/      # Traduction
│   │   │   └── pdf-text/       # Extraction texte PDF
│   │   ├── library/            # Page bibliothèque
│   │   ├── paper/[id]/         # Lecteur de document
│   │   ├── globals.css         # Tailwind + CSS variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── chat/               # ChatPanel, ChatMessage
│   │   ├── highlights/         # HighlightsPanel
│   │   ├── notes/              # NotesPanel
│   │   ├── pdf-highlighter/    # Viewer PDF principal (react-pdf-highlighter)
│   │   ├── upload/             # PaperUploader
│   │   └── ui/                 # shadcn/ui primitives
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── citations/          # Prompts et validation citations
│   │   ├── mistral-ocr/        # Client OCR Mistral
│   │   ├── ocr/                # Abstraction OCR
│   │   ├── pdf/                # Parser PDF, constantes
│   │   ├── supabase/           # Client Supabase (client + server)
│   │   └── utils.ts            # Utilitaires
│   └── types/                  # Types TypeScript
│       ├── paper.ts            # Type Paper
│       ├── highlight.ts        # Type Highlight
│       ├── note.ts             # Type Note
│       └── citation.ts         # Type Citation
├── .claude/                    # Claude Code config
│   ├── productbacklog.md       # Backlog produit
│   └── skills/                 # Custom skills
├── CLAUDE.md                   # This file
├── AGENTS.md                   # Guidelines projet
├── CHANGELOG.md                # Journal des modifications
├── TODO.md                     # Tâches en cours
└── package.json
```

## Conventions de Code

### TypeScript
- **TOUJOURS** TypeScript strict, jamais `any`
- Interfaces pour les props, types pour les unions
- Imports absolus avec `@/` prefix

### Composants React
- Composants fonctionnels uniquement
- Nommage PascalCase
- Props destructurees avec types

```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  onAction?: (value: string) => void;
}

export function Component({ required, optional = 42, onAction }: ComponentProps) {
  // ...
}
```

### Style (IMPORTANT)
- **UNIQUEMENT** les tokens CSS definis dans globals.css
- **INTERDIT**: bg-purple-*, bg-violet-*, #random-hex, couleurs arbitraires
- **AUTORISE**: bg-background, bg-primary, text-foreground, border-border, etc.
- Palette: dark + accent orange (--primary: 15 90% 55%)

## Tokens CSS Disponibles

| Token | Usage |
|-------|-------|
| `bg-background` | Fond principal (220 20% 7%) |
| `bg-card` | Fond cartes (220 20% 10%) |
| `bg-primary` | Boutons principaux (15 90% 55%) |
| `bg-secondary` | Elements secondaires |
| `bg-muted` | Fonds subtils |
| `text-foreground` | Texte principal |
| `text-muted-foreground` | Texte secondaire |
| `text-primary` | Texte accent |
| `border-border` | Bordures |

## Citations - Regle Critique

Les citations sont la feature principale. Format obligatoire :

```typescript
interface Citation {
  page: number;      // 1-indexed
  start: number;     // Offset dans text_content de la page
  end: number;       // Offset fin
  quote: string;     // Extrait pour verification (max 100 chars)
}
```

**TOUJOURS** :
1. Valider que start/end sont dans les limites du texte
2. Stocker les text_items avec positions normalisees (0-1)
3. Ne jamais faire confiance au LLM pour les positions sans validation

## Erreurs Frequentes a Eviter

1. Ne pas utiliser `any` en TypeScript
2. Ne pas utiliser de couleurs hors tokens
3. Ne pas faire confiance au LLM pour les positions sans validation
4. Ne pas hardcoder les URLs d'API
5. Ne pas commiter les fichiers .env

## Variables d'Environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
DEEPINFRA_API_KEY=
MISTRAL_API_KEY=
DOCLING_API_URL=
```

## Priorités Actuelles (voir .claude/productbacklog.md)

### 🔴 Haute Priorité
- **TECH-001**: Consolidation viewer (garder uniquement react-pdf-highlighter)
- **F1-001**: Recherche & filtres bibliothèque
- **RAG-001**: Index sémantique des chunks pour chat IA

### 🐛 Bugs Critiques
- **BUG-001**: Suppression paper laisse des orphelins en DB
- **BUG-002**: Erreurs Supabase invisibles côté UI

## Workflow Git

- Main branch: `main`
- Features: `feature/description`
- Bug fixes: `fix/description`
- Commits: Conventional Commits en anglais (`feat:`, `fix:`, `refactor:`)

## Agents Disponibles

Les agents specialises sont dans `.claude/agents/`. Utilise-les proactivement selon le contexte.

| Agent | Quand l'utiliser |
|-------|------------------|
| **pdf-expert** | Extraction de texte PDF, positions, text items, debugging PDF, OCR. Utiliser pour tout probleme lie au parsing PDF. |
| **code-reviewer** | **PROACTIF** - Apres avoir ecrit du code significatif. Verifie qualite, securite, bonnes pratiques Python/React. |
| **ui-designer** | Creation de composants UI, design system, accessibilite, patterns d'interaction, responsive design. |
| **frontend-developer** | Implementation de composants React, TypeScript, tests frontend, state management. |
| **fullstack-developer** | Features end-to-end (DB -> API -> UI), authentication, real-time, integration complete. |
| **architect-reviewer** | Revue d'architecture, patterns, scalabilite, decisions techniques, dette technique. |
| **llm-architect** | Architecture LLM, RAG, fine-tuning, prompts, optimisation inference, safety. Cle pour le chat avec citations. |
| **ai-engineer** | Pipelines ML, deploiement modeles, MLOps, evaluation, monitoring IA. |
| **agent-organizer** | Selection et assemblage d'equipes d'agents, decomposition de taches complexes. |
| **multi-agent-coordinator** | Orchestration de workflows multi-agents, communication inter-agents, fault tolerance. |

### Usage Recommande

```
Tache simple (1 fichier)     -> Pas d'agent, faire directement
Code significatif ecrit      -> code-reviewer (proactif)
Probleme PDF/citations       -> pdf-expert
Nouveau composant UI         -> ui-designer + frontend-developer
Feature complete             -> fullstack-developer
Architecture a valider       -> architect-reviewer
Integration LLM/RAG          -> llm-architect
Tache complexe multi-etapes  -> agent-organizer pour planifier
```

## Quand tu es bloqué

1. Lis la skill pertinente dans `.claude/skills/`
2. Consulte l'agent approprié (voir section ci-dessus)
3. Vérifie les types avec `npm run lint`
4. Lance `npm run build` pour voir les erreurs

## Rappels Importants

- **Imports absolus** : Utiliser `@/` (ex: `@/components/ui/button`)
- **Theme tokens** : Uniquement ceux définis dans `globals.css` (pas de couleurs arbitraires)
- **CHANGELOG** : Mise à jour OBLIGATOIRE après chaque modification de code
- **Productbacklog** : Vérifier et mettre à jour `.claude/productbacklog.md`
