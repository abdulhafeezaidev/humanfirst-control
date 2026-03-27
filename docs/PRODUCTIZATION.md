# Productization Plan

You already have working software (a Vite/React frontend + Supabase backend). “Turning this into software” usually means making it:
- deployable (repeatable builds + environments)
- secure (hard multi-tenant boundaries + least privilege)
- operable (logging/monitoring/backups)
- sellable (licensing/billing, onboarding, support)

This doc outlines realistic paths and the recommended next steps.

## What you have today
- Frontend: Vite + React + TS + Tailwind
- Backend: Supabase
  - Postgres schema/RLS/RPC in `supabase/migrations/`
  - Edge Functions in `supabase/functions/`
  - Client-side Supabase config in `src/integrations/supabase/*`

## Choose the “software” shape

### Option A — SaaS web app (recommended)
Ship it as a hosted web admin + student portal.
- Pros: fastest to market, easiest updates, Supabase fits well
- Cons: you must handle production security/ops

### Option B — Desktop app (Electron/Tauri)
Package the web UI as a desktop app.
- Pros: better control over kiosk/exam mode enforcement
- Cons: adds a full release pipeline for Windows/macOS; still needs a backend

### Option C — On‑prem/self‑host
Institutions host their own instance.
- Pros: some buyers prefer it
- Cons: hardest support + version drift + infra complexity

## Recommended roadmap (SaaS first)

### 1) Environments (dev/staging/prod)
- Create separate Supabase projects for `dev`, `staging`, `prod`.
- Use different env vars per environment.
- Keep `supabase/config.toml` aligned with the project you’re deploying to.

### 2) Security & tenancy hardening
- Confirm every table has:
  - `organization_id`
  - RLS enabled
  - policies that prevent cross‑org access
- Avoid any direct PostgREST calls without auth headers.
- Keep service role keys ONLY in Edge Functions / server contexts.

### 3) Edge Functions: authentication & CORS
- Prefer `verify_jwt=true` for user-invoked functions.
- Restrict CORS to your real frontend origin(s), especially for admin endpoints.
- Add explicit rate limiting / abuse controls where needed.

### 4) Operations
- Backups: enable scheduled DB backups.
- Monitoring: log errors from Edge Functions and critical client flows.
- Audit logging: keep and test audit trails; ensure retention cleanup is safe.

### 5) Onboarding & product UX
- Institution onboarding flow (create org + first super_admin).
- Admin invitation flow.
- Clear “pilot mode” vs “production mode” toggles.

### 6) Billing & licensing (when ready)
- Decide pricing model: per student, per institution, per seat.
- Add subscription enforcement:
  - billing status table
  - middleware checks in Edge Functions
  - UI feature gates

## Build/release basics
This repo now includes:
- `npm run build`
- `npm run typecheck`
- `npm run test`

Windows note: if PowerShell blocks `npm`, use `npm.cmd` (e.g. `npm.cmd run build`).

## Next decision (so I can implement the right path)
Answer these 3 questions and I’ll implement the next concrete steps:
1) Are you shipping **SaaS web app** first, or **desktop app** first?
2) Do you need **multi-institution tenancy** (many schools in one instance) right away?
3) Where do you want to deploy the frontend: **Vercel** or **Netlify** (or something else)?
