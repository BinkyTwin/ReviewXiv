# Code Quality Standards

## Before Writing Code

1. **Understand the context** - Read related files before modifying
2. **Plan before coding** - For complex changes, use "think" or "think hard" to evaluate alternatives
3. **Check existing patterns** - Follow established patterns in the codebase

## TypeScript Rules

### Strict Mode Compliance
- **NEVER** use `any` type - use `unknown` or proper typing
- **ALWAYS** define explicit return types for functions
- **PREFER** interfaces for object shapes, types for unions

### Import Organization
```typescript
// 1. External libraries
import { useState, useEffect } from 'react';

// 2. Internal modules (absolute paths)
import { cn } from '@/lib/utils';

// 3. Types
import type { ComponentProps } from './types';
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ReaderToolbar` |
| Functions | camelCase | `handleClick` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Files (components) | PascalCase | `ReaderToolbar.tsx` |
| Files (utilities) | kebab-case | `pdf-utils.ts` |

## React Best Practices

### Component Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Component definition
// 5. Hooks (in consistent order)
// 6. Handlers
// 7. Effects
// 8. Render
```

### Props
- Destructure props with explicit types
- Provide default values where sensible
- Use optional chaining for optional callback props

```typescript
interface Props {
  title: string;
  count?: number;
  onAction?: (id: string) => void;
}

export function Component({ title, count = 0, onAction }: Props) {
  // ...
}
```

### State Management
- Keep state as local as possible
- Lift state only when necessary
- Use `useMemo` and `useCallback` for expensive operations

## Error Handling

### API Calls
```typescript
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    // Handle known errors
  } else {
    // Log and handle unknown errors
    console.error('Unexpected error:', error);
  }
}
```

### Never Swallow Errors
```typescript
// ❌ Bad
try { doSomething(); } catch {}

// ✅ Good
try {
  doSomething();
} catch (error) {
  console.error('Operation failed:', error);
  // Handle appropriately
}
```

## Performance Considerations

- Avoid unnecessary re-renders
- Memoize expensive calculations
- Use lazy loading for heavy components
- Debounce rapid user inputs (search, resize, etc.)

## Code Review Checklist (Self-Review)

Before committing, verify:
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] No console.log statements (unless intentional)
- [ ] No hardcoded values that should be constants
- [ ] Error cases are handled
- [ ] Loading/error states are implemented
