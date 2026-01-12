const NEW_ID_PATTERN = /^(\d{4}\.\d{4,5})(v\d+)?$/i;
const OLD_ID_PATTERN = /^([a-z\-]+\/\d{7})(v\d+)?$/i;

function normalizeId(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (NEW_ID_PATTERN.test(trimmed) || OLD_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function extractArxivId(input: string): string | null {
  const normalized = normalizeId(input);
  if (normalized) return normalized;

  const match = input.match(
    /(?:arxiv\.org|ar5iv\.labs\.arxiv\.org)\/(?:abs|pdf|html)\/([^?#]+)/i,
  );
  if (!match) return null;

  const rawId = match[1].replace(/\.pdf$/i, "");
  return normalizeId(rawId) ?? rawId.trim();
}
