# AGENTS.md - ReviewXiv

## Project Overview

AI research assistant for analyzing academic documents (PDF). Import PDFs, read, highlight, chat, translate with precise citations (page + offsets).

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript strict, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Storage) - **Use CLI only, not MCP**
- **LLM**: OpenRouter API (multi-models)
- **PDF**: pdf.js, react-pdf-highlighter
- **OCR**: Mistral OCR, Docling

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

## Coding Standards

### TypeScript
- **Always** strict TypeScript, never `any`
- Interfaces for props, types for unions
- Absolute imports with `@/` prefix

### React Components
- Functional components only
- PascalCase naming
- Destructured props with types

### Styling
- **ONLY** CSS tokens from globals.css
- **FORBIDDEN**: bg-purple-*, bg-violet-*, #random-hex, arbitrary colors
- **ALLOWED**: bg-background, bg-primary, text-foreground, border-border

## Database (Supabase CLI)

### Installation & Setup
```bash
# Install as dev dependency
npm install supabase --save-dev

# Or run directly with npx (requires Node.js 20+)
npx supabase --help

# Initialize project (creates supabase/ folder)
supabase init

# Start local Supabase (requires Docker)
supabase start

# Stop local services
supabase stop
```

### Migrations & Types
```bash
supabase migration list      # Check status
supabase migration new NAME  # Create migration
supabase db push             # Apply to remote
supabase db pull             # Pull remote schema
supabase db diff --linked    # Compare local vs remote
supabase gen types typescript --linked > src/types/database.ts
```

### Local URLs (after `supabase start`)
| Service | URL |
|---------|-----|
| API | http://localhost:54321 |
| Studio | http://localhost:54323 |
| DB | postgresql://postgres:postgres@localhost:54322/postgres |

📚 **Full reference**: `.codex/skills/supabase-cli/SKILL.md`

**Never use MCP for Supabase. Always use CLI.**

## Git Workflow

- Main branch: `main`
- Features: `feature/description`
- Bug fixes: `fix/description`
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`)

## Skills Available

Use `$skill-name` to invoke:
- `$supabase-cli` - Database management
- `$context7` - Up-to-date library docs
- `$code-reviewer` - Code review
- `$frontend-developer` - UI components
- `$fullstack-developer` - End-to-end features
- `$ui-designer` - Design system
- `$architect-reviewer` - Architecture review


## Context7 rules 

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## Key Rules

1. **Always run `npm run lint`** before commits
2. **Update CHANGELOG.md** after any code change
3. **Check `.codex/skills/`** for specialized guidance
4. **Use Supabase CLI** for all database operations

## CHANGELOG Rule

After ANY code change, update `CHANGELOG.md`:

```markdown
## 2025-12-27

FIX: Short description
FEATURE: Short description
REFACTOR: Short description
```

Use present tense: "Add", "Fix", "Update" (not "Added", "Fixed").
