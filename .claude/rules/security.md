# Security Best Practices

## Environment Variables

### NEVER Commit Secrets
- All API keys, tokens, and secrets go in `.env.local`
- Verify `.gitignore` includes all env files
- Use `.env.local.example` for documentation

### Naming Convention
```bash
# Public (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=

# Private (server-only, never expose to client)
OPENROUTER_API_KEY=
SUPABASE_SERVICE_KEY=
```

### Accessing Environment Variables
```typescript
// Server-side only - direct access
const apiKey = process.env.OPENROUTER_API_KEY;

// Client-side - only NEXT_PUBLIC_ vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

## Input Validation

### Always Validate User Input
```typescript
// ❌ Trusting user input
const page = parseInt(req.body.page);

// ✅ Validate and sanitize
const page = parseInt(req.body.page, 10);
if (isNaN(page) || page < 1 || page > document.pageCount) {
  throw new ValidationError('Invalid page number');
}
```

### Sanitize Before Rendering
```typescript
// For any user-generated content displayed in HTML
import DOMPurify from 'dompurify';

const safeHtml = DOMPurify.sanitize(userContent);
```

## API Security

### Rate Limiting
Implement rate limiting on public endpoints:
- Login attempts: 5 per minute
- API calls: 100 per minute per user
- File uploads: 10 per hour

### Authentication Checks
```typescript
// Always verify authentication on protected routes
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Proceed with authenticated logic
}
```

### Authorization Checks
```typescript
// Verify user has access to the resource
const document = await getDocument(documentId);
if (document.userId !== session.userId) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Database Security

### Use Parameterized Queries
```typescript
// ❌ SQL injection vulnerable
const query = `SELECT * FROM documents WHERE id = '${id}'`;

// ✅ Parameterized (Supabase handles this)
const { data } = await supabase
  .from('documents')
  .select()
  .eq('id', id);
```

### Row Level Security (RLS)
- Enable RLS on all tables in Supabase
- Define policies for SELECT, INSERT, UPDATE, DELETE
- Users should only access their own data

## File Upload Security

1. **Validate file type** - Check MIME type and extension
2. **Limit file size** - Set maximum upload size
3. **Scan for malware** - Use virus scanning if available
4. **Store safely** - Use Supabase Storage with proper policies
5. **Generate safe names** - Use UUIDs, not user-provided names

```typescript
const ALLOWED_TYPES = ['application/pdf'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new ValidationError('Only PDF files are allowed');
}

if (file.size > MAX_SIZE) {
  throw new ValidationError('File exceeds 50MB limit');
}
```

## LLM Security

### Prevent Prompt Injection
- Never concatenate untrusted input directly into prompts
- Use structured prompts with clear delimiters
- Validate LLM outputs before using

### Don't Trust LLM Output
```typescript
// ❌ Trusting LLM positions
const citation = llmResponse.citation;
highlightText(citation.start, citation.end);

// ✅ Validate LLM output
const citation = llmResponse.citation;
if (!isValidPosition(citation, document)) {
  throw new Error('Invalid citation position from LLM');
}
highlightText(citation.start, citation.end);
```

## Sensitive Data Handling

### Logging
```typescript
// ❌ Logging sensitive data
console.log('User login:', { email, password });

// ✅ Redact sensitive fields
console.log('User login:', { email, password: '[REDACTED]' });
```

### Error Messages
```typescript
// ❌ Exposing internal details
return { error: `Database error: ${err.message}` };

// ✅ Generic user-facing error
console.error('Database error:', err);
return { error: 'An error occurred. Please try again.' };
```

## Security Checklist

Before deploying:
- [ ] No secrets in code or commits
- [ ] Environment variables properly configured
- [ ] Input validation on all endpoints
- [ ] Authentication on protected routes
- [ ] Authorization checks for resources
- [ ] Rate limiting implemented
- [ ] RLS enabled on database tables
- [ ] File uploads validated
- [ ] Error messages don't leak internal details
