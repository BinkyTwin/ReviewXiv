# CHANGELOG

This file tracks main tasks completed by AI agents. Only significant changes are logged here.

---

## 2025-12-29

FIX: Configure pdfjs workerSrc for server PDF text extraction
FIX: Use pdfjs legacy build with disabled worker in PDF text extraction
FIX: Enforce PDF size limit and improve ingest error reporting for uploads
FIX: Fix PDFViewer "Transport destroyed" crash - add mount checks and proper cleanup for PDF.js
FIX: Fix React error #185 - defer ref state updates with requestAnimationFrame
FIX: Disable PDFHighlighterViewer (v3) due to React 18/19 incompatibility causing infinite loops
FIX: Fix PDF upload - use .maybeSingle() instead of .single() to avoid 406 errors
FIX: Auto-cleanup failed uploads - delete storage file and DB record on extraction failure
FIX: Exclude error status papers from duplicate detection, allow re-upload of failed PDFs

## 2025-12-28
FIX: Add .npmrc with legacy-peer-deps for Vercel deployment (React 19 + react-pdf-highlighter-extended)
FEATURE: Add resizable panels - drag handle between PDF viewer and chat panel
FEATURE: Persist panel width preference in localStorage
FIX: Fix chat panel overflow - add min-h-0 and overflow-hidden for proper flexbox scrolling
FIX: Parse JSON from markdown code blocks in vision model responses (chat API)
KNOWN ISSUE: Area selection (Capture figure) limited by react-pdf-highlighter-extended library
FIX: Prioritize OPENROUTER_MODEL over settings.openrouter_model in LLM routing
CHORE: Update default OpenRouter model to google/gemma-3-27b-it:free
FIX: Fix selection menu not showing after consecutive highlights (use ref instead of state)
FIX: Fix area selection mode closure bug with useRef for stable enableAreaSelection callback
FIX: Migrate from react-pdf-highlighter to react-pdf-highlighter-extended v8.1.0 to fix initialization bugs
REFACTOR: Rewrite PDFHighlighterViewer for new library API (context-based highlight rendering)
FIX: Update pdfjs-dist workerSrc to match resolved version 4.8.69
FIX: Delay v3 highlight rendering until pdf.js viewer is ready to avoid getPageView crash
FIX: Restore persistent highlight rendering and scroll-to behavior in PDFHighlighterViewer v3
FIX: Add fit-width zoom controls with capped scale range in PDFHighlighterViewer v3
FIX: Load actual page dimensions from PDF.js for correct highlight positioning in v3 viewer
FIX: Use numeric values for zoom levels instead of strings in PDFHighlighterViewer
FEATURE: Add vision support in chat for image/figure analysis (Phase 6.4)
FEATURE: Connect PaperReader with imageContext for area selection → chat flow
FEATURE: Add image preview in ChatPanel input and ChatMessage display
FEATURE: Update /api/chat to support vision message format for LLMs
FEATURE: Create AreaSelectionTip component for figure/image captures (Phase 6.3)
FEATURE: Add area selection mode toggle in ZoomToolbar
FEATURE: Enable area selection with Alt+drag or toggle button
FEATURE: Create ZoomToolbar component with zoom in/out/fit-width controls (Phase 6.2)
FEATURE: Add pdfScaleValue state for zoom control in PDFHighlighterViewer
FIX: Render persistent highlights with correct colors in v3 viewer (Phase 6.1)
FEATURE: Add HIGHLIGHT_COLORS map for DeepRead → CSS rgba conversion
FEATURE: Implement CitationFlash component for visual citation highlighting in PDFHighlighterViewer
FEATURE: Add textItemsMap prop to PDFHighlighterViewer for citation → rects conversion
FEATURE: Connect offsetsToRects with CitationFlash for chat citations in v3 viewer
FEATURE: Add react-pdf-highlighter integration with new PDFHighlighterViewer component
FEATURE: Create position conversion utilities (ScaledPosition <-> HighlightRect)
FEATURE: Create highlight adapter utilities for Supabase <-> react-pdf-highlighter
FEATURE: Add HighlightTip component with keyboard shortcuts (H, A, T, 1-5, Escape)
FEATURE: Integrate PDFHighlighterViewer in PaperReader with ?viewer=v3 flag
FEATURE: Add highlight create/delete handlers for v3 viewer
FEATURE: Connect Ask/Translate actions from v3 viewer to chat and translation modal
REFACTOR: Clean up broken pdf-v2 files (PDFViewer, PDFPage, empty hooks/toolbar)

FEATURE: Render Mistral OCR HTML output in SmartPDFViewer (no markdown)
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
