---
name: supabase-cli
description: Use Supabase CLI to manage the database, migrations, storage, and Edge Functions. The user is already logged in via `supabase login`. Use this skill when asked to create tables, migrations, RLS policies, or query the database.
---

# Supabase CLI for Claude Code

## Project info
- **Project ref:** `iyyqdoahxhmdumojnqip`
- **Linked:** Yes (via `supabase link`)
- **Migrations folder:** `supabase/migrations/`
- **Config file:** `supabase/config.toml`

---

## Quick Reference

| Task | Command |
|------|---------|
| Check migration status | `supabase migration list` |
| Create new migration | `supabase migration new <name>` |
| Push migrations to remote | `supabase db push` |
| Pull remote schema | `supabase db pull` |
| Diff local vs remote | `supabase db diff --linked` |
| Dump remote schema | `supabase db dump -f schema.sql` |
| Generate TypeScript types | `supabase gen types typescript --linked` |
| Reset local DB | `supabase db reset` |

---

## Database Commands

### Migrations

```bash
# Create a new migration (creates file in supabase/migrations/)
supabase migration new <migration_name>
# → Creates: supabase/migrations/<timestamp>_<migration_name>.sql

# List all migrations (local vs remote status)
supabase migration list

# Push local migrations to remote database
supabase db push

# Dry run (see what would be applied)
supabase db push --dry-run

# Pull remote schema as a new migration
supabase db pull

# Repair migration history (mark as applied/reverted)
supabase migration repair <version> --status applied
supabase migration repair <version> --status reverted

# Squash multiple migrations into one
supabase migration squash
```

### Schema Inspection

```bash
# Diff local migrations against linked remote
supabase db diff --linked

# Diff and save to a new migration file
supabase db diff --linked -f <migration_name>

# Dump remote schema to file
supabase db dump -f supabase/schema.sql

# Dump data only
supabase db dump --data-only -f supabase/seed.sql

# Dump specific schemas
supabase db dump --schema public,auth -f dump.sql

# Lint database for issues
supabase db lint --linked
```

### Local Development

```bash
# Start local Supabase stack
supabase start

# Stop local stack (keeps data)
supabase stop

# Stop and delete all data
supabase stop --no-backup

# Check local services status
supabase status

# Reset local database (re-applies all migrations + seed)
supabase db reset

# Start only the database (lighter)
supabase db start
```

---

## Generate Types

```bash
# Generate TypeScript types from linked project
supabase gen types typescript --linked > src/types/database.ts

# Generate from local database
supabase gen types typescript --local > src/types/database.ts
```

---

## Edge Functions

```bash
# Create a new function
supabase functions new <function_name>

# List deployed functions
supabase functions list

# Serve functions locally (with hot reload)
supabase functions serve

# Deploy a specific function
supabase functions deploy <function_name>

# Deploy all functions
supabase functions deploy

# Delete a function from remote
supabase functions delete <function_name>
```

---

## Storage (Experimental)

```bash
# List storage contents
supabase storage ls --linked --experimental

# Copy file to storage
supabase storage cp ./local/file.pdf ss:///bucket/path --linked --experimental

# Remove file
supabase storage rm ss:///bucket/file.pdf --linked --experimental
```

---

## Secrets Management

```bash
# List all secrets
supabase secrets list

# Set a secret
supabase secrets set MY_SECRET=value

# Set from .env file
supabase secrets set --env-file .env.production

# Unset a secret
supabase secrets unset MY_SECRET
```

---

## Database Inspection Tools

```bash
# Show table bloat
supabase inspect db bloat --linked

# Show blocking queries
supabase inspect db blocking --linked

# Show long-running queries
supabase inspect db long-running-queries --linked

# Show query outliers (slow queries)
supabase inspect db outliers --linked

# Show vacuum stats
supabase inspect db vacuum-stats --linked

# Show locks
supabase inspect db locks --linked

# Generate full report
supabase inspect report --linked
```

---

## Workflow Rules

### 1. Always inspect before modifying
```bash
supabase migration list          # See current state
supabase db diff --linked        # See pending changes
```

### 2. Use migrations for ALL schema changes
```bash
# ✅ Correct workflow:
supabase migration new add_users_table
# Edit the generated SQL file
supabase db push

# ❌ Never run raw DDL directly on remote
```

### 3. Migration file naming
Files are auto-named: `<timestamp>_<name>.sql`
- Use descriptive names: `add_user_roles`, `create_notifications_table`
- One logical change per migration

### 4. Destructive operations
**ALWAYS ask for confirmation before:**
- DROP TABLE / DROP COLUMN
- TRUNCATE
- DELETE without WHERE
- Any irreversible schema change

### 5. Output expectations
When executing commands:
1. Show the command being run
2. Display the output
3. Summarize what changed
4. If migration: show the SQL content

---

## Testing Database (pgTAP)

```bash
# Create a new test
supabase test new <test_name>

# Run all tests
supabase test db

# Run tests on linked project
supabase test db --linked
```

---

## Project Schema Reference

### papers table
```sql
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### paper_pages table
```sql
CREATE TABLE paper_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text_content TEXT,
  text_items JSONB,
  width FLOAT,
  height FLOAT,
  has_text BOOLEAN DEFAULT true
);
```

### highlights table
```sql
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color TEXT DEFAULT 'yellow',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chat_messages table
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Troubleshooting

### Migration conflicts
```bash
# If local and remote are out of sync:
supabase migration list           # See the difference
supabase migration repair <ver> --status reverted  # Remove from remote history
supabase db pull                  # Re-sync
```

### Reset everything locally
```bash
supabase stop --no-backup
supabase start
```

### Check linked project
```bash
supabase status  # Shows API URL, DB URL, keys
```

## ReviewXiv Database Schema (reference)

### papers table
```sql
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### paper_pages table
```sql
CREATE TABLE paper_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text_content TEXT,
  text_items JSONB,
  width FLOAT,
  height FLOAT,
  has_text BOOLEAN DEFAULT true
);
```

### highlights table
```sql
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color TEXT DEFAULT 'yellow',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chat_messages table
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
