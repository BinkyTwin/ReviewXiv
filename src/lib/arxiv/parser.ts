import * as cheerio from "cheerio";
import type {
  ArxivEquation,
  ArxivFigure,
  ArxivParsedPaper,
  ArxivReference,
  ArxivSection,
} from "@/lib/arxiv/types";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return collapseWhitespace(value);
    }
  }
  return null;
}

function extractMeta($: cheerio.CheerioAPI, name: string): string | null {
  const content = $(`meta[name="${name}"]`).attr("content");
  return content ? collapseWhitespace(content) : null;
}

function extractMetaList(
  $: cheerio.CheerioAPI,
  name: string,
): string[] {
  return $(`meta[name="${name}"]`)
    .map((_, el) => $(el).attr("content") || "")
    .get()
    .map((value) => collapseWhitespace(value))
    .filter((value) => value.length > 0);
}

function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((value) => collapseWhitespace(value))
    .filter((value) => value.length > 0);
}

export function parseArxivHtml(
  html: string,
  arxivId: string,
): ArxivParsedPaper {
  const $ = cheerio.load(html);

  const title = firstNonEmpty([
    extractMeta($, "citation_title"),
    $("h1.title").first().text(),
    $("h1.ltx_title").first().text(),
    $("h1").first().text(),
  ]);

  const abstract = firstNonEmpty([
    extractMeta($, "citation_abstract"),
    $(".abstract").first().text(),
    $(".ltx_abstract").first().text(),
    $("#abstract").first().text(),
  ]);

  const metaAuthors = extractMetaList($, "citation_author");
  const authors =
    metaAuthors.length > 0
      ? metaAuthors
      : $(".authors, .ltx_authors")
          .first()
          .find("a, span, div")
          .map((_, el) => collapseWhitespace($(el).text()))
          .get()
          .filter((value) => value.length > 0);

  const categories = [
    ...parseCategories(extractMeta($, "citation_arxiv_category")),
    ...parseCategories(extractMeta($, "citation_keywords")),
  ];

  const submittedDate = firstNonEmpty([
    extractMeta($, "citation_date"),
    extractMeta($, "citation_publication_date"),
    extractMeta($, "dc.date"),
  ]);

  const metadata = {
    title,
    authors: Array.from(new Set(authors)),
    abstract,
    categories: Array.from(new Set(categories)),
    arxivId: extractMeta($, "citation_arxiv_id") || arxivId,
    submittedDate,
  };

  const sectionElements = $(".ltx_section");
  const sectionNodes = sectionElements.length > 0 ? sectionElements : $("section");
  const sections: ArxivSection[] = [];

  sectionNodes.each((_, element) => {
    const section = $(element);
    const rawText = section.text();
    if (!rawText || rawText.trim().length === 0) {
      return;
    }

    const heading = section.find("h1,h2,h3,h4,h5,h6").first();
    const headingNode = heading.get(0);
    const headingTag = headingNode?.tagName || headingNode?.name;
    const level = headingTag ? parseInt(headingTag.replace("h", ""), 10) : null;
    const titleText = heading.length ? collapseWhitespace(heading.text()) : null;
    const sectionId = section.attr("id") || `section-${sections.length + 1}`;

    sections.push({
      sectionIndex: sections.length,
      sectionId,
      title: titleText,
      level,
      textContent: rawText,
      htmlContent: section.html(),
    });
  });

  const figures: ArxivFigure[] = $("figure")
    .map((_, element) => {
      const figure = $(element);
      return {
        figureId: figure.attr("id") || null,
        caption: firstNonEmpty([figure.find("figcaption").text()]),
        htmlContent: figure.html(),
      };
    })
    .get();

  const equations: ArxivEquation[] = $(".ltx_equation, .equation, math")
    .map((_, element) => {
      const equation = $(element);
      const latex =
        equation
          .find("annotation[encoding='application/x-tex']")
          .first()
          .text() || null;
      return {
        equationId: equation.attr("id") || null,
        latex,
        mathml: equation.is("math") ? $.html(equation) || null : null,
      };
    })
    .get();

  const references: ArxivReference[] = $("#references li, .ltx_bibliography li")
    .map((_, element) => {
      const ref = $(element);
      return {
        referenceId: ref.attr("id") || null,
        label: firstNonEmpty([ref.find(".ltx_tag").text()]),
        text: collapseWhitespace(ref.text()),
      };
    })
    .get();

  return {
    metadata,
    sections,
    figures,
    equations,
    references,
    rawHtml: html,
  };
}
