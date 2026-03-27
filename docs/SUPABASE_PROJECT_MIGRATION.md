# Supabase Project Migration (Switch Backend)

This repo uses Supabase as its backend:
- DB schema, RLS, and RPC are in `supabase/migrations/`
- Edge Functions are in `supabase/functions/`
- The frontend connects via `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

## 1) Point the frontend at a new project
1. Create a new Supabase project (Dashboard).
2. In this repo, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

See `.env.example`.

## 2) Migrate database schema (recommended)
Prereq: install Supabase CLI.

- Link this repo to the *new* project:
  - `supabase login`
  - `supabase link --project-ref <NEW_PROJECT_REF>`

- Apply migrations to the new project:
  - `supabase db push`

Notes:
- This will create tables, RLS policies, and SQL functions defined in `supabase/migrations/*`.
- If you already have data in the old project and need to copy it, do a separate data export/import (schema migrations do not copy data).

## 3) Deploy Edge Functions
Deploy each function directory:
- `supabase functions deploy admin-management`
- `supabase functions deploy audit-logs`
- `supabase functions deploy enforcement-metrics`
- `supabase functions deploy metrics-aggregator`
- `supabase functions deploy data-retention-cleanup`

## 4) Set required function secrets
Some functions use privileged DB access.

- Set the scheduled-job secret used by `metrics-aggregator`:
  - `HF_CRON_SECRET=<random-long-string>`

You can set secrets via CLI:
- `supabase secrets set HF_CRON_SECRET=...`

If any function requires additional secrets in your environment, set them in the Supabase dashboard/CLI.

## 5) (Optional) Regenerate TypeScript DB types
The typed schema used by the frontend is in `src/integrations/supabase/types.ts`.
If your new project’s schema differs, regenerate types with the Supabase CLI `gen types` command (exact flags depend on your CLI version).

## 6) Validate
- Run the app locally and confirm:
  - Auth works
  - Admin pages can read/write via RPC
  - Edge Functions invocations work
  - Realtime subscriptions connect
