@echo off
setlocal enabledelayedexpansion

REM Sync cloud Supabase data -> local Supabase (Docker) for easier offline editing.
REM - Requires: Docker Desktop running, local Supabase running (scripts\supabase.cmd start)
REM - Requires: Supabase CLI logged in + linked project (scripts\supabase.cmd login / link)
REM - Requires: cloud DB password in SUPABASE_DB_PASSWORD
REM
REM NOTE: This script copies DATA ONLY (no schema). Keep schema in sync via migrations.

cd /d %~dp0\..

if "%SUPABASE_DB_PASSWORD%"=="" (
  echo ERROR: SUPABASE_DB_PASSWORD is not set.
  echo Set it in this terminal session then re-run:
  echo   set SUPABASE_DB_PASSWORD=YOUR_DB_PASSWORD
  exit /b 1
)

if not exist exports mkdir exports

set DUMP_FILE=exports\cloud-data.sql
echo Dumping cloud data to %DUMP_FILE% ...

REM Dump selected schemas. Adjust as needed.
call scripts\supabase.cmd db dump --linked --data-only --use-copy --keep-comments --schema public --schema auth --schema storage --file "%DUMP_FILE%" --password "%SUPABASE_DB_PASSWORD%"
if errorlevel 1 (
  echo ERROR: supabase db dump failed.
  exit /b 1
)

echo Loading data into local Postgres (localhost:54322) ...
echo This can take a while for large datasets.

type "%DUMP_FILE%" | docker run --rm -i postgres:16-alpine psql "postgresql://postgres:postgres@host.docker.internal:54322/postgres"
if errorlevel 1 (
  echo ERROR: Failed to load dump into local Postgres.
  exit /b 1
)

echo Done.
echo Tip: open Supabase Studio at http://127.0.0.1:54323 to browse/edit local data.
