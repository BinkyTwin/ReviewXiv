# CHANGELOG

This file tracks main tasks completed by AI agents. Only significant changes are logged here.

---

## 2025-12-28

FEATURE: Implement Phase 3.1 - Hybrid Canvas First rendering pipeline for SmartPDFViewer
FEATURE: Add CanvasLayer component for PDF.js canvas rendering (visual source of truth)
FEATURE: Add PDFTextLayer component with selectable text spans and normalized coordinates
FEATURE: Create usePDFDocument hook to load PDF.js and extract text items
FEATURE: Add /api/pdf-text endpoint for server-side text extraction with positions
FEATURE: Add renderMode prop to SmartPDFViewer ("markdown", "canvas", "hybrid")
FEATURE: Create CanvasPage component for canvas-based page rendering with all overlay layers
REFACTOR: Phase 3.2 - Improve OCR markdown cleanup (remove [object Object], fix punctuation, empty elements)
FEATURE: Add "Save as highlight" action for chat citations
FIX: Improve citation flash animation in PDF viewers
FEATURE: Complete Phase 3.0 - Inline Translation persistence with Supabase
FEATURE: Create `inline_translations` table migration with RLS policies
FEATURE: Add translations API route (GET, POST, PUT, DELETE with bulk delete)
FEATURE: Persist inline translations to Supabase (load on mount, save on apply, toggle state)
FIX: Hide inactive TabsContent to prevent ChatPanel split in empty state

## 2025-12-27

UX: Remove large empty space in Chat panel when no messages (compact empty state)
FIX: Make "Ask AI" from highlights panel switch to Chat tab automatically
FIX: Correct click-outside handler in SelectionContextBar to allow Radix dropdown portals (fix highlight via menu click)
FEATURE: Add HighlightsPanel component for managing highlights in Notes tab
FEATURE: Add delete all highlights functionality with confirmation dialog
FEATURE: Integrate highlights list in Notes panel with quick navigation, Ask AI, and delete actions
REFACTOR: Extend highlights API to support bulk delete (`?paperId=xxx&all=true`)
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
FIX: Use OCR page dimensions instead of fixed A4 sizing in SmartPDFViewer canvas rendering
FIX: Sanitize Mistral OCR markdown to remove `[object Object]` artifacts and normalize spacing
DOCS: Expand smart viewer plan with hybrid canvas pipeline, style-preserving translation, and capture gadget
FIX: Correct CSS highlight classes in TextBlock.tsx (use `highlight-yellow` instead of `bg-highlight-yellow/35`)
REFACTOR: Add new reader/layers directory structure for modular layer components
REFACTOR: Add new reader/selection directory for selection components
FEATURE: Create comprehensive plan for Smart PDF Viewer (Alphaxiv-level) in `.claude/plan-smart-viewer.md`
CHORE: Add comprehensive Claude Code rules to `.claude/rules/`
CHORE: Create modular rule files (changelog, code-quality, git-workflow, testing, documentation, workflow, security)
CHORE: Add rules index with priority levels and quick reference
