# Documentation Standards

## Code Documentation

### When to Write Comments

**DO Comment:**
- Complex algorithms or business logic
- Non-obvious decisions ("why", not "what")
- Workarounds and their reasons
- Public APIs and interfaces
- Regex patterns

**DON'T Comment:**
- Self-explanatory code
- What the code does (the code tells that)
- Commented-out code (delete it, use git)

### JSDoc for Public Functions

```typescript
/**
 * Extracts text content from a PDF page with position data.
 * 
 * @param page - The PDF.js page object
 * @param options - Extraction options
 * @returns Array of text items with normalized positions (0-1 range)
 * @throws {PDFParseError} When page content cannot be extracted
 * 
 * @example
 * const items = await extractTextFromPage(page, { includeStyles: true });
 */
export async function extractTextFromPage(
  page: PDFPageProxy,
  options?: ExtractOptions
): Promise<TextItem[]> {
  // ...
}
```

### Inline Comments

```typescript
// ✅ Good - Explains WHY
// We use a 100ms delay to batch rapid consecutive highlights
// and prevent UI flickering during document scrolling
await debounce(updateHighlights, 100);

// ❌ Bad - Explains WHAT (code already shows this)
// Set the delay to 100
const delay = 100;
```

## README Guidelines

Every significant directory or package should have:

1. **Purpose** - What does this code do?
2. **Quick start** - How to use it immediately
3. **API** - Key functions/components and their usage
4. **Examples** - Working code examples
5. **Caveats** - Known limitations or gotchas

## API Documentation

For API routes, document:

```typescript
/**
 * POST /api/documents/analyze
 * 
 * Analyzes a document using the configured LLM.
 * 
 * Request Body:
 * {
 *   documentId: string;     // UUID of the document to analyze
 *   prompt: string;         // Analysis prompt
 *   options?: {
 *     model?: string;       // LLM model to use (default: from env)
 *     temperature?: number; // 0-1 (default: 0.7)
 *   }
 * }
 * 
 * Response:
 * {
 *   analysis: string;       // LLM response
 *   citations: Citation[];  // Referenced document sections
 *   usage: TokenUsage;      // Token consumption stats
 * }
 * 
 * Errors:
 * - 400: Invalid request body
 * - 404: Document not found
 * - 500: LLM processing error
 */
export async function POST(request: Request) {
  // ...
}
```

## Type Documentation

```typescript
/**
 * Represents a citation reference in a document.
 * Citations link LLM responses back to source material.
 */
interface Citation {
  /** 1-indexed page number in the source document */
  page: number;
  
  /** Start offset in the page's text content (character position) */
  start: number;
  
  /** End offset in the page's text content (character position) */
  end: number;
  
  /** 
   * Short excerpt for display and verification.
   * Truncated to max 100 characters.
   */
  quote: string;
}
```

## Updating Documentation

When making code changes:

1. **Update inline comments** if logic changes
2. **Update JSDoc** if function signature/behavior changes
3. **Update README** if usage changes
4. **Update CHANGELOG** (always - see changelog.md rule)
5. **Update TODO.md** if completing or adding tasks

## Self-Documenting Code

Prefer clear naming over comments:

```typescript
// ❌ Needs comment to explain
const d = 86400000;

// ✅ Self-documenting
const MILLISECONDS_PER_DAY = 86400000;

// ❌ Needs comment
function process(items: Item[]) {
  return items.filter(i => i.s === 'a' && i.d > Date.now());
}

// ✅ Self-documenting
function getActiveItems(items: Item[]): Item[] {
  return items.filter(item => 
    item.status === 'active' && item.expirationDate > Date.now()
  );
}
```
