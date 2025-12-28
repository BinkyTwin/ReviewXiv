# Agentic Workflow Best Practices

## The EPCP Workflow (Explore → Plan → Code → Commit)

For any non-trivial task, follow this sequence:

### 1. Explore
- Read relevant files before modifying
- Understand existing patterns and conventions
- Check for related code that might be affected
- Use subagents to investigate complex questions

**Prompt pattern:**
```
"Read [files/components] related to X. Do NOT write any code yet.
Explain what you find and any patterns you observe."
```

### 2. Plan
- Outline the approach before implementation
- Consider edge cases and error handling
- Identify potential breaking changes
- Use "think" or "think hard" for complex decisions

**Prompt pattern:**
```
"Based on your exploration, plan how to implement X.
Think hard about alternatives. Do NOT write code yet."
```

### 3. Code
- Implement the solution following the plan
- Verify as you go (type check, lint)
- Handle errors appropriately
- Follow code quality standards

**Prompt pattern:**
```
"Implement the plan. Run npm run build after each major change
to verify no errors. Update tests if needed."
```

### 4. Commit
- Run final verification (build + lint)
- Update CHANGELOG.md (mandatory)
- Update TODO.md if applicable
- Create atomic commits

**Prompt pattern:**
```
"Verify the build passes. Update CHANGELOG.md with today's changes.
Commit with a conventional commit message."
```

## Context Management

### Use /clear Regularly
Between unrelated tasks, use `/clear` to reset context and avoid confusion from previous conversations.

### Mention Relevant Files
Be specific about files: "Look at `src/components/Reader.tsx`" is better than "look at the reader component."

### Provide Images When Relevant
- Screenshots for UI bugs
- Mockups for design tasks
- Error screenshots for debugging

## Handling Complex Tasks

### Use Checklists
For multi-step tasks, ask Claude to create a checklist:
```
"Create a Markdown checklist for this migration.
Work through each item one by one, checking off as you complete."
```

### Break Down Large Tasks
Instead of: "Refactor the entire PDF module"
Do: "First, identify the components in the PDF module. Then we'll refactor one at a time."

### Verify Incrementally
After each significant change:
1. Run `npm run build`
2. Run `npm run lint`
3. Test the specific feature
4. Then continue

## Course Correction

### Interrupt Early
Press Escape if Claude is going in the wrong direction. It's better to redirect early than undo later.

### Be Specific About Issues
```
// ❌ Vague
"That's not right, fix it"

// ✅ Specific
"The button should be orange, not blue. Update the className 
to use bg-primary instead of bg-secondary."
```

### Ask for Alternatives
```
"This approach has X issue. What are other ways to solve 
the original problem? Think hard about alternatives."
```

## Prompt Tips for Better Results

### Specify Output Format
```
"Return the result as a TypeScript interface, not a class"
```

### Set Constraints
```
"Keep the component under 100 lines. Extract logic to hooks if needed."
```

### Request Verification
```
"After implementing, verify by running npm run build. 
Only consider it done if there are no errors."
```

### Use Emphasis for Critical Rules
```
"YOU MUST use the existing design tokens. NEVER add custom colors."
```

## When Claude Gets Stuck

1. Try `/clear` and rephrase the request
2. Break down into smaller steps
3. Provide more context or examples
4. Consult relevant skills in `.claude/skills/`
5. Use appropriate agent from `.claude/agents/`
