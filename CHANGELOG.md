# CHANGELOG

This file tracks main tasks completed by AI agents. Only significant changes are logged here.

---

## 2025-12-27

FEATURE: Create library page (`/library`) with document table showing title, authors, status, pages, date, and tags
FEATURE: Add TranslationLayer for inline translations with toggle between original/translated text
FEATURE: Implement "Apply on document" button in TranslationModal for persistent inline translations
FEATURE: Add SelectionContextBar with keyboard shortcuts (H=Highlight, T=Translate, A=Ask AI, Esc=Close)
FEATURE: Implement highlight system for SmartPDFViewer (v2) with relative positioning
FEATURE: Add HighlightLayer component with percentage-based coordinates for scroll-safe rendering
FEATURE: Add CitationLayer component for AI citation flash animations
FEATURE: Enable text selection in SmartPDFViewer with SelectionPopover integration
FIX: Stabilize SmartPDFViewer v2 selection highlighting using DOM rects to prevent disappearing selections
FIX: Make v2 highlight creation deterministic by persisting selection rects into highlight records
UX: Refine SelectionContextBar (remove floating HTAC hint, add shortcut badges, token-based color swatches)
FIX: Correct CSS highlight classes in TextBlock.tsx (use `highlight-yellow` instead of `bg-highlight-yellow/35`)
REFACTOR: Add new reader/layers directory structure for modular layer components
REFACTOR: Add new reader/selection directory for selection components
FEATURE: Create comprehensive plan for Smart PDF Viewer (Alphaxiv-level) in `.claude/plan-smart-viewer.md`
CHORE: Add comprehensive Claude Code rules to `.claude/rules/`
CHORE: Create modular rule files (changelog, code-quality, git-workflow, testing, documentation, workflow, security)
CHORE: Add rules index with priority levels and quick reference
