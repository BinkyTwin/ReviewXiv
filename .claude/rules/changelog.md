# Changelog Rule - MANDATORY

🔴 **CRITICAL: ALWAYS UPDATE CHANGELOG.md AFTER ANY CODE CHANGE**

## When to Update

After completing ANY of these:
- Bug fixes (FIX:)
- New features (FEATURE:)
- Refactoring (REFACTOR:)
- Maintenance tasks (CHORE:)
- Performance improvements (PERF:)
- Security fixes (SECURITY:)
- Breaking changes (BREAKING:)

## How to Update

1. Open `CHANGELOG.md` in project root
2. Find or create today's date section: `## YYYY-MM-DD`
3. Add entry at the TOP of today's section
4. Use the appropriate prefix based on change type

## Format

```markdown
## 2025-12-27

FIX: Short description of what was fixed
FEATURE: Short description of new feature
REFACTOR: Short description of refactoring
CHORE: Short description of maintenance task
PERF: Short description of performance improvement
SECURITY: Short description of security fix
BREAKING: Short description of breaking change
```

## Rules

- One line per change
- Use present tense: "Add", "Fix", "Update" (not "Added", "Fixed")
- Be concise but descriptive
- Include relevant context (component name, API endpoint, etc.)
- Add entry IMMEDIATELY after completing the code change
- Group related changes under the same prefix if they're part of one task

## Example Workflow

1. Make code change
2. Run lint/typecheck
3. **UPDATE CHANGELOG.md** ← DO NOT SKIP THIS
4. Commit changes
5. Done

## Bad vs Good Examples

❌ Bad:
- `FIX: Fixed bug` (too vague)
- `FEATURE: Added the new thing` (past tense, unclear)
- `update stuff` (no prefix, unclear)

✅ Good:
- `FIX: Resolve PDF parsing error for multi-column layouts`
- `FEATURE: Add citation highlight animation in Reader component`
- `REFACTOR: Extract ReaderToolbar into standalone component`

**This is NON-NEGOTIABLE. Every code change = changelog entry.**
