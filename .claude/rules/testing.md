# Testing Standards

## Testing Philosophy

- **Test behavior, not implementation** - Focus on what the code does, not how
- **Test-Driven Development (TDD)** - Write tests first for complex features
- **Coverage isn't everything** - Quality over quantity

## When to Write Tests

### MUST Have Tests
- Critical business logic
- Data transformations
- API endpoints
- Utility functions
- Complex state management

### SHOULD Have Tests
- Component rendering
- User interactions
- Error boundaries
- Edge cases

## Test Structure

Use the **AAA Pattern**: Arrange, Act, Assert

```typescript
describe('ComponentOrFunction', () => {
  describe('methodOrScenario', () => {
    it('should expected behavior when condition', () => {
      // Arrange - Set up test data and conditions
      const input = { value: 'test' };
      
      // Act - Execute the code under test
      const result = processInput(input);
      
      // Assert - Verify the outcome
      expect(result).toBe('expected');
    });
  });
});
```

## Naming Conventions

### Test Files
- Unit tests: `component.test.ts` or `component.spec.ts`
- Integration tests: `feature.integration.test.ts`
- E2E tests: `flow.e2e.test.ts`

### Test Descriptions
```typescript
// ✅ Good - Describes behavior
it('should return error message when email is invalid')
it('should disable submit button while loading')
it('should highlight citation when clicked')

// ❌ Bad - Implementation focused
it('should set isError to true')
it('should call setState')
```

## Mocking Guidelines

### When to Mock
- External APIs
- Database calls
- Time-sensitive operations
- Heavy computations (in unit tests)

### When NOT to Mock
- The code under test
- Simple utilities
- Native JavaScript methods

```typescript
// Mock external dependency
vi.mock('@/lib/api', () => ({
  fetchDocument: vi.fn(),
}));

// Use the mock
const mockFetch = vi.mocked(fetchDocument);
mockFetch.mockResolvedValue({ id: '1', title: 'Test' });
```

## Testing Async Code

```typescript
// Async/await pattern
it('should fetch and display data', async () => {
  render(<Component />);
  
  // Wait for async operation
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

## Component Testing Best Practices

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- path/to/test.ts

# Run tests with coverage
npm run test:coverage
```

## TDD Workflow with Claude

1. **Tell Claude to write tests first** - "Write tests for X, do NOT implement yet"
2. **Verify tests fail** - Confirm tests are actually testing something
3. **Commit tests** - Lock in the expected behavior
4. **Implement** - "Now implement code to pass these tests"
5. **Iterate** - Let Claude fix failing tests
6. **Commit implementation** - When all tests pass
