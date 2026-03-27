# Lovable Cloud export → New Supabase project

This repo includes a script to import a Lovable Cloud JSON export (like `exports/humanfirst-export-.../`) into a fresh Supabase project.

## What you have
Your export folder should contain:
- `schema.sql`
- `auth_users.json`
- `data/*.json`

Example: `exports/humanfirst-export-2026-01-27T11-39-28/`

## Step 1 — Create the new Supabase project
- Create a new project in Supabase Dashboard.

## Step 2 — Import schema
- Supabase Dashboard → SQL Editor
- Open the export’s `schema.sql` and run it.

This creates tables/enums/RLS setup.

## Step 3 — Prepare service-role credentials
The import script requires **service role** credentials for the NEW project.

Set these in your terminal session (do not commit them):

PowerShell:
- `$env:SUPABASE_URL = "https://YOUR_NEW_PROJECT_REF.supabase.co"`
- `$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_NEW_SERVICE_ROLE_KEY"`

## Step 4 — Run the importer
From the repo root:

- Dry-run (no writes):
  - `node scripts/import-lovable-export.mjs --exportDir exports/humanfirst-export-2026-01-27T11-39-28 --dry-run`

- Real import:
  - `node scripts/import-lovable-export.mjs --exportDir exports/humanfirst-export-2026-01-27T11-39-28`

What it does:
- Creates/invites users in the NEW project by email (so they can set passwords)
- Generates `user_id_map.json` inside the export folder
- Imports tables in dependency order
- Remaps user UUID references (like `profiles.user_id`, `audit_logs.actor_id`, `exam_policies.created_by`) to the NEW auth user IDs

## Step 5 — User login after migration
Because password hashes cannot be exported:
- Users will need to set a new password (invite email) OR use the app’s “Forgot password” flow.

## Step 6 — Point the app at the new project
Update your `.env` (or `.env.local`) to the new project:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

Restart dev server / rebuild desktop app.
