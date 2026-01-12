-- Force HTML support schema (idempotent).
-- NOTE: This migration exists because a previous migration version was marked applied remotely
-- but the schema may not have been applied (migration history divergence).

ALTER TABLE papers
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS html_cached BOOLEAN DEFAULT FALSE;

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

CREATE INDEX IF NOT EXISTS idx_paper_html_cache_arxiv_id
  ON paper_html_cache(arxiv_id);

CREATE TABLE IF NOT EXISTS paper_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  section_index INT NOT NULL,
  section_id TEXT,
  title TEXT,
  level INT,
  text_content TEXT NOT NULL,
  html_content TEXT,
  parent_section_id UUID REFERENCES paper_sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_sections_paper_id
  ON paper_sections(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_sections_section_id
  ON paper_sections(section_id);

ALTER TABLE highlights
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS section_id TEXT;

ALTER TABLE inline_translations
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS section_id TEXT;

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html')),
ADD COLUMN IF NOT EXISTS section_id TEXT;

ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS section_id TEXT,
ADD COLUMN IF NOT EXISTS chunk_strategy TEXT DEFAULT 'character';

CREATE INDEX IF NOT EXISTS idx_chunks_section_id
  ON chunks(section_id);
