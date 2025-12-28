# CLAUDE.md - DeepRead AI Research Assistant

## Description
Application d'assistant de recherche IA pour analyser des documents academiques (PDF).
Objectif : importer un PDF, le lire, surligner, discuter, traduire, avec des citations precises (page + offsets).

## Rules (IMPORTANT)

1. **Always use Context7** when I need code generation, setup or configuration steps, or library/API documentation.
2. **Follow EPCP workflow** (Explore -> Plan -> Code -> Commit) for any feature or bug fix.
3. **Use Supabase MCP** for database operations - never write raw SQL without explaining first.
4. **Use GitHub CLI** (gh) for issues and PRs when available.
5. **TodoList** regarde toujours TODO.md, si la tache que tu allais effectue y figure, alors quand tu finis, note un x dessus. Si la tache n'y figure pas, écrit là, et quand tu auras finis met le x

## Stack Technique
- **Frontend**: Next.js 14 (App Router), TypeScript strict, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Storage)
- **LLM**: OpenRouter API (multi-modeles)
- **PDF Processing**: pdf.js

## Commandes Essentielles

```bash
npm install          # Install dependencies
npm run dev          # Serveur dev (port 3000)
npm run build        # Build production
npm run lint         # ESLint
```

## Structure Projet

```
deepread/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API Routes
│   │   ├── globals.css    # Tailwind + CSS variables
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/
│   │   └── ui/            # shadcn/ui components
│   └── lib/
│       └── utils.ts       # Utility functions
├── .claude/               # Claude Code config
│   ├── skills/            # Custom skills
│   └── plan.md            # Current plan
├── CLAUDE.md              # This file
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
OPENROUTER_API=
OPENROUTER_MODEL=
```

## Workflow Git

- Main branch: `main`
- Features: `feature/description`
- Bug fixes: `fix/description`
- Commits: messages en anglais, format conventionnel

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

## Quand tu es bloque

1. Lis la skill pertinente dans `.claude/skills/`
2. Consulte l'agent approprie (voir section ci-dessus)
3. Verifie les types
4. Lance `npm run build` pour voir les erreurs
