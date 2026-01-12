import { extractArxivId } from "@/lib/arxiv/utils";

const ARXIV_HTML_BASE = "https://arxiv.org/html";
const AR5IV_HTML_BASE = "https://ar5iv.labs.arxiv.org/html";
const USER_AGENT = "ReviewXiv/1.0 (+https://reviewxiv.local)";

type ArxivHtmlSource = "arxiv" | "ar5iv";

export interface ArxivFetchResult {
  arxivId: string;
  html: string;
  sourceUrl: string;
  source: ArxivHtmlSource;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries: number = 2,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
        redirect: "follow",
      });

      if (response.ok) {
        return await response.text();
      }

      const status = response.status;
      const isRetryable = status >= 500 || status === 429;

      if (!isRetryable) {
        throw new Error(`HTTP ${status} for ${url}`);
      }

      lastError = new Error(`HTTP ${status} for ${url}`);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Failed to fetch HTML");
    }

    if (attempt < retries) {
      await sleep(300 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Failed to fetch HTML");
}

export async function fetchArxivHtmlById(
  arxivId: string,
): Promise<ArxivFetchResult> {
  const sources: Array<{ base: string; source: ArxivHtmlSource }> = [
    { base: ARXIV_HTML_BASE, source: "arxiv" },
    { base: AR5IV_HTML_BASE, source: "ar5iv" },
  ];

  let lastError: Error | null = null;

  for (const { base, source } of sources) {
    const sourceUrl = `${base}/${arxivId}`;
    try {
      const html = await fetchWithRetry(sourceUrl);
      return { arxivId, html, sourceUrl, source };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Failed to fetch HTML");
    }
  }

  throw lastError ?? new Error("No HTML source available");
}

export async function fetchArxivHtml(
  input: string,
): Promise<ArxivFetchResult> {
  const arxivId = extractArxivId(input);
  if (!arxivId) {
    throw new Error("Invalid arXiv identifier");
  }

  return fetchArxivHtmlById(arxivId);
}
