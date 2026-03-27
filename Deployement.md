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
