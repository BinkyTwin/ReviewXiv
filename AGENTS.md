# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages, API routes under `src/app/api`, plus `layout.tsx` and `globals.css`.
- `src/components`: feature components; `src/components/ui` holds shadcn/ui primitives.
- `src/lib`: OCR, citations, Supabase clients, and shared utilities.
- `src/hooks` and `src/types`: reusable hooks and TypeScript types.
- `src/app/fonts`: local fonts; `test-doc` contains sample PDFs.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: produce a production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint with Next.js core-web-vitals and TypeScript rules.

## Coding Style & Naming Conventions
- TypeScript is strict; avoid `any` and prefer explicit interfaces for props.
- Use 2-space indentation and absolute imports via `@/`.
- React components are functional and named in PascalCase.
- TailwindCSS + shadcn/ui only; use theme tokens from `src/app/globals.css` (e.g., `bg-background`, `text-foreground`) and avoid arbitrary colors.

## Testing Guidelines
- No dedicated test runner is configured yet; rely on `npm run lint` and manual QA.
- If you introduce tests, document the runner and keep them under `src` (e.g., `src/__tests__/...`) with descriptive names.

## Commit & Pull Request Guidelines
- Recent history follows Conventional Commits in English (`feat:`, `fix:`, `refactor:`); keep the same pattern.
- Branch naming: `feature/short-description` or `fix/short-description`.
- PRs should include a clear summary, linked issues, and screenshots or recordings for UI changes.

## Task Tracking
- Check `TODO.md` before starting work; add your task if missing and mark it done when completed.

## Configuration & Secrets
- Copy `.env.local.example` to `.env.local` and set Supabase/OpenRouter/DeepInfra/Mistral/Docling keys as needed.
- Never commit `.env.local` or credentials.

######RULES#####
# Changelog Rule - MANDATORY

🔴 **CRITICAL: ALWAYS UPDATE CHANGELOG.md AFTER ANY CODE CHANGE**

## When to Update

After completing ANY of these:
- Bug fixes (FIX:)
- New features (FEATURE:)
- Refactoring (REFACTOR:)
- Maintenance tasks (CHORE:)
- Performance improvements (PERF:)
- Security fixes (SECURITY:)
- Breaking changes (BREAKING:)

## How to Update

1. Open `CHANGELOG.md` in project root
2. Find or create today's date section: `## YYYY-MM-DD`
3. Add entry at the TOP of today's section
4. Use the appropriate prefix based on change type

## Format

```markdown
## 2025-12-27

FIX: Short description of what was fixed
FEATURE: Short description of new feature
REFACTOR: Short description of refactoring
CHORE: Short description of maintenance task
PERF: Short description of performance improvement
SECURITY: Short description of security fix
BREAKING: Short description of breaking change
```

## Rules

- One line per change
- Use present tense: "Add", "Fix", "Update" (not "Added", "Fixed")
- Be concise but descriptive
- Include relevant context (component name, API endpoint, etc.)
- Add entry IMMEDIATELY after completing the code change
- Group related changes under the same prefix if they're part of one task

## Example Workflow

1. Make code change
2. Run lint/typecheck
3. **UPDATE CHANGELOG.md** ← DO NOT SKIP THIS
4. Commit changes
5. Done

## Bad vs Good Examples

❌ Bad:
- `FIX: Fixed bug` (too vague)
- `FEATURE: Added the new thing` (past tense, unclear)
- `update stuff` (no prefix, unclear)

✅ Good:
- `FIX: Resolve PDF parsing error for multi-column layouts`
- `FEATURE: Add citation highlight animation in Reader component`
- `REFACTOR: Extract ReaderToolbar into standalone component`

**This is NON-NEGOTIABLE. Every code change = changelog entry.**
