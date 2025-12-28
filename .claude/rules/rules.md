# Claude Code Rules - Index

This directory contains modular rules for Claude Code. Each rule file focuses on a specific aspect of the development workflow.

## Rule Files

| File | Purpose | Priority |
|------|---------|----------|
| `changelog.md` | **MANDATORY** - Changelog update rules | 🔴 Critical |
| `workflow.md` | EPCP workflow and agentic best practices | ⚡ High |
| `code-quality.md` | TypeScript and React standards | ⚡ High |
| `git-workflow.md` | Git conventions and commit format | 🟡 Medium |
| `testing.md` | Testing standards and TDD workflow | 🟡 Medium |
| `documentation.md` | Code and API documentation standards | 🟡 Medium |
| `security.md` | Security best practices | 🔴 Critical |

## How Rules Work

1. **Automatic loading**: Claude Code automatically loads rules from `.claude/rules/` when context is relevant
2. **Modular design**: Each file focuses on one domain, making it easy to update
3. **Priority levels**: Critical rules (🔴) must always be followed; others are best practices

## Quick Reference

### Every Code Change
1. Follow the **EPCP workflow** (Explore → Plan → Code → Commit)
2. Run `npm run build` and `npm run lint`
3. **Update CHANGELOG.md** (mandatory)
4. Commit with conventional commit format

### Before Pushing
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] CHANGELOG.md updated
- [ ] No `any` types
- [ ] No hardcoded secrets

## Adding New Rules

1. Create a new `.md` file in this directory
2. Follow the existing format (title, sections, examples)
3. Add the file to this index
4. Keep rules focused on one domain

## Rule Effectiveness

Rules should be:
- **Concise**: Easy to scan quickly
- **Actionable**: Clear dos and don'ts
- **Correct with examples**: Show good vs bad patterns
- **Iterated**: Tune based on what works

Update rules when you notice repeated issues or new best practices emerge.
