# Supabase + VS Code (no local DB)

If you **don’t want to run Supabase locally**, skip the Supabase CLI + Docker entirely.
You can manage your **cloud Supabase Postgres** from VS Code by connecting directly to the database.

## Recommended: connect with a query tool extension

Use either:
- **PostgreSQL** (ckolkman.vscode-postgres), or
- **PostgreSQL** (ms-azuretools.vscode-postgresql)

Then create a connection using your Supabase project’s DB connection string:

1. Supabase Dashboard → Project Settings → Database → Connection string
2. Use the **Direct connection** (port 5432)
3. Ensure SSL is enabled (Supabase requires SSL)

Connection facts for this project:
- Host: `db.vhmabzrpanixljbdpjob.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`

## About postgres-language-server

If you installed **PostgreSQL Language Server** (uniquevision.vscode-plpgsql-lsp):
- It’s great for SQL/PLpgSQL *language features* (diagnostics/completions)
- But it **does not expose an SSL configuration**, so it often cannot connect to Supabase cloud Postgres directly

Practical setup:
- Keep the language server for editor help.
- Use one of the query tool extensions above for actual cloud DB management.

## Optional: local Supabase (requires Docker)

Only do this if you later decide you want a local stack:

```bat
scripts\supabase.cmd login
scripts\supabase.cmd link --project-ref vhmabzrpanixljbdpjob
scripts\supabase.cmd db pull
scripts\supabase.cmd start
```

If you just want to check whether it’s running:

```bat
scripts\supabase.cmd status
```

## Local Supabase + migrations workflow (recommended for schema changes)

This workflow is best when you want to:
- develop schema changes safely (migrations in git)
- test locally before touching production

### 1) One-time: log in and link to cloud

```bat
scripts\supabase.cmd login
scripts\supabase.cmd link --project-ref vhmabzrpanixljbdpjob
```

### 2) Pull cloud schema into migrations

```bat
scripts\supabase.cmd db pull
```

### 3) Reset local DB to migrations

```bat
scripts\supabase.cmd db reset
```

### 4) (Optional) Copy cloud data into local

This is optional because your **cloud DB remains the source of truth**.
Use it if you want a local copy to browse/edit without affecting production.

```bat
set SUPABASE_DB_PASSWORD=YOUR_CLOUD_DB_PASSWORD
scripts\sync-cloud-data-to-local.cmd
```

### 5) Make schema changes locally

After changing schema locally (SQL editor / Studio), generate a migration:

```bat
scripts\supabase.cmd db diff -f my_change
```

### 6) Push migrations to cloud

```bat
scripts\supabase.cmd db push
```

Note: pushing **data edits** back to cloud is not what migrations are best at.
For production data changes, prefer running explicit SQL against the cloud DB.
