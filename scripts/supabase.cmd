@echo off
setlocal

REM Wrapper to run Supabase CLI via npx without PowerShell execution policy issues.
REM Usage:
REM   scripts\supabase.cmd status
REM   scripts\supabase.cmd start
REM   scripts\supabase.cmd stop --no-backup

cd /d %~dp0\..
npx supabase %*
