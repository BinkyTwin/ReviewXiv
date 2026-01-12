export interface ArxivMetadata {
  title: string | null;
  authors: string[];
  abstract: string | null;
  categories: string[];
  arxivId: string;
  submittedDate: string | null;
}

export interface ArxivSection {
  sectionIndex: number;
  sectionId: string | null;
  title: string | null;
  level: number | null;
  textContent: string;
  htmlContent: string | null;
}

export interface ArxivFigure {
  figureId: string | null;
  caption: string | null;
  htmlContent: string | null;
}

export interface ArxivEquation {
  equationId: string | null;
  latex: string | null;
  mathml: string | null;
}

export interface ArxivReference {
  referenceId: string | null;
  label: string | null;
  text: string | null;
}

export interface ArxivParsedPaper {
  metadata: ArxivMetadata;
  sections: ArxivSection[];
  figures: ArxivFigure[];
  equations: ArxivEquation[];
  references: ArxivReference[];
  rawHtml: string;
}
