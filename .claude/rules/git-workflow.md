# Git Workflow Standards

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/short-description` | `feature/pdf-highlight` |
| Bug fix | `fix/short-description` | `fix/citation-offset` |
| Refactor | `refactor/short-description` | `refactor/reader-toolbar` |
| Hotfix | `hotfix/short-description` | `hotfix/auth-bypass` |
| Chore | `chore/short-description` | `chore/update-deps` |

## Commit Message Format

Use **Conventional Commits** format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples
```bash
# Simple
feat(reader): add citation highlight animation

# With body
fix(pdf): resolve parsing error for multi-column layouts

The PDF parser was incorrectly merging text blocks across columns.
Added column detection before text extraction.

Closes #123
```

## Pre-Commit Checklist

Before every commit:
1. ✅ Run `npm run build` - No TypeScript errors
2. ✅ Run `npm run lint` - No ESLint errors
3. ✅ Update CHANGELOG.md (see changelog.md rule)
4. ✅ Review your own diff
5. ✅ Commit only related changes together

## When to Commit

- **Commit often** - Small, atomic commits are better
- **Commit working code** - Each commit should not break the build
- **One logical change per commit** - Don't mix refactoring with features

## Git Commands Cheat Sheet

```bash
# Check status
git status

# Stage specific files
git add path/to/file

# Interactive staging
git add -p

# Commit with message
git commit -m "type(scope): message"

# Amend last commit (before push)
git commit --amend

# View recent commits
git log --oneline -10

# Create and switch to new branch
git checkout -b feature/new-feature

# Push branch
git push -u origin feature/new-feature
```

## Pull Request Guidelines

When creating a PR:
1. Use descriptive title following commit format
2. Fill out the PR template completely
3. Link related issues
4. Request appropriate reviewers
5. Add labels if applicable

## Handling Conflicts

1. Pull latest main: `git pull origin main`
2. Rebase if simple: `git rebase main`
3. Merge if complex: `git merge main`
4. Resolve conflicts carefully
5. Test after resolution
