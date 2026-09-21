# Deployment Guide (Pilot)

## Current State
- Local development supported
- Cloud deployment optional

## Required
- Node version: 18+ (20+ recommended)
- Environment variables (frontend):
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
- Supabase project access (for DB migrations + Edge Functions deployment)

## Suggested Deployment
- Frontend: Vercel / Netlify
- Backend: Supabase Edge Functions (no separate VPS required)
- Database: Supabase Postgres

## Supabase notes
- Edge Functions live in `supabase/functions/*`.
- Database schema + RLS + RPC live in `supabase/migrations/*`.
- For cron/scheduled metrics aggregation, set secret `HF_CRON_SECRET` in the Supabase project.

## Notes
This document exists to remove tool dependency.

## Desktop App Distribution
- **Auto-Updates**: The project is now configured to use GitHub Releases for auto-updates. You must push your code to GitHub and use a CI pipeline (e.g. GitHub Actions) to run `npm run desktop:package` and upload the release artifact.
- **Code Signing (Windows SmartScreen)**: The generated `.exe` is currently unsigned. When students download it, Windows SmartScreen will display an "Unknown Publisher" warning. To remove this, you must purchase an EV Code Signing Certificate and configure `electron-builder` with your certificate credentials.
