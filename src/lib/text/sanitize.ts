/**
 * Sanitize text for PostgreSQL storage.
 * Removes null characters and other control characters.
 */
export function sanitizeTextForDb(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}
