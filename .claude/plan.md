# Plan: Initialisation Next.js 14 avec shadcn/ui

## Goal
Initialiser un projet Next.js 14 App Router avec TypeScript strict, TailwindCSS et shadcn/ui, configuré avec une palette dark "alpha-like" (fond sombre, accent orange).

## Current state (from repo)
- Files inspected: `.gitignore`, `CLAUDE.md`, `claude_configuration.md`, structure projet
- Existing behavior: Projet vide (ancien code deepread-app/api supprimé)
- Structure `.claude/` existante avec skills EPCP

## Approach

### 1) Initialiser Next.js 14 avec App Router
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```
- TypeScript strict activé
- TailwindCSS inclus
- App Router (pas Pages Router)
- Dossier `src/` pour organisation

### 2) Configurer shadcn/ui
```bash
npx shadcn@latest init
```
- Style: New York (plus sobre)
- Base color: Neutral/Slate
- CSS variables: Yes

### 3) Configurer la palette dark alpha-like
Modifier `src/app/globals.css` avec:
- `--background`: 220 20% 7% (fond très sombre)
- `--foreground`: 0 0% 95% (texte clair)
- `--primary`: 15 90% 55% (accent orange-rouge)
- Supprimer le mode light (dark uniquement)

### 4) Installer composants shadcn/ui de base
```bash
npx shadcn@latest add button card input
```

### 5) Mettre à jour CLAUDE.md
- Nouvelles commandes npm
- Structure Next.js 14
- Tokens CSS définis

## Risks / edge cases
- Version Next.js 14 spécifique (pas 15) - utiliser `create-next-app@14`
- shadcn/ui peut écraser globals.css - sauvegarder la palette custom après
- Le `--no-import-alias` évite les conflits avec `@/` qu'on configurera proprement

## Acceptance criteria
- [ ] `npm run dev` lance le serveur sur port 3000
- [ ] `npm run build` compile sans erreur
- [ ] TypeScript strict activé dans tsconfig.json
- [ ] Palette dark visible (fond sombre, texte clair)
- [ ] Un composant shadcn/ui fonctionne (Button)
- [ ] CLAUDE.md à jour avec nouvelles commandes
