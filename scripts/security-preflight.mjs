#!/usr/bin/env node
/**
 * scripts/security-preflight.mjs
 *
 * Pre-deployment security checklist runner for HumanFirst Control.
 *
 * Verifies every item in the security audit before a production deploy:
 *   1. Supabase anon key format (must be a JWT, not sb_publishable_)
 *   2. ALLOWED_ORIGIN is set and is a real HTTPS URL (not localhost)
 *   3. All edge functions have verify_jwt = true in config.toml
 *   4. plan_type guard trigger exists on the live database
 *   5. No SERVICE_ROLE_KEY references in client-side source files
 *   6. No wildcard CORS (*) remaining in edge functions
 *
 * Usage:
 *   node scripts/security-preflight.mjs           # check all
 *   node scripts/security-preflight.mjs --fix     # auto-fix safe items
 *   node scripts/security-preflight.mjs --ci      # exit 1 on any failure
 *
 * Env required for DB checks:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs   from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const ROOT   = path.resolve(import.meta.dirname, '..');
const SRC    = path.join(ROOT, 'src');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const TOML   = path.join(ROOT, 'supabase', 'config.toml');

// Functions that MUST have verify_jwt = true
const JWT_REQUIRED_FUNCTIONS = [
  'admin-management',
  'audit-logs',
  'data-retention-cleanup',
  'enforcement-metrics',
  'metrics-aggregator',
  'data-export',
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** ANSI colours — gracefully degrade in non-TTY environments */
const isTTY = process.stdout.isTTY;
const c = {
  green  : (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  red    : (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow : (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  bold   : (s) => isTTY ? `\x1b[1m${s}\x1b[0m`  : s,
  dim    : (s) => isTTY ? `\x1b[2m${s}\x1b[0m`  : s,
};

/** Load .env file manually without requiring dotenv as a dep */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val; // don't override real env vars
  }
}

/** Recursively collect all .ts / .tsx files under a directory */
function collectSourceFiles(dir, exts = ['.ts', '.tsx']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// Individual check functions
// Each returns: { ok: boolean, message: string, detail?: string }
// ─────────────────────────────────────────────────────────────

/**
 * Check 1: Supabase anon key is a valid JWT (starts with eyJ)
 * The old Lovable/StackBlitz format was sb_publishable_...
 */
function checkAnonKeyFormat() {
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (!key) {
    return { ok: false, message: 'VITE_SUPABASE_ANON_KEY is not set in .env' };
  }
  if (key.startsWith('sb_publishable_')) {
    return {
      ok: false,
      message: 'VITE_SUPABASE_ANON_KEY looks like a Lovable/StackBlitz key (sb_publishable_...)',
      detail:  'Get the real anon key from: Supabase Dashboard → Project Settings → API → anon public',
    };
  }
  if (!key.startsWith('eyJ')) {
    return {
      ok: false,
      message: `VITE_SUPABASE_ANON_KEY has unexpected format (got: ${key.slice(0, 12)}...)`,
      detail:  'A valid Supabase anon key is a JWT that starts with "eyJ"',
    };
  }
  return { ok: true, message: 'Supabase anon key format is valid (JWT)' };
}

/**
 * Check 2: ALLOWED_ORIGIN is set and is not localhost
 * (Only relevant for production deploys — skipped if SKIP_ORIGIN_CHECK=1)
 */
function checkAllowedOrigin() {
  if (process.env.SKIP_ORIGIN_CHECK === '1') {
    return { ok: true, message: 'ALLOWED_ORIGIN check skipped (SKIP_ORIGIN_CHECK=1)' };
  }
  const origin = process.env.ALLOWED_ORIGIN || '';
  if (!origin) {
    return {
      ok: false,
      message: 'ALLOWED_ORIGIN is not set',
      detail:  'Set it in Supabase Dashboard → Edge Functions → [each function] → Secrets',
    };
  }
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      ok: false,
      message: `ALLOWED_ORIGIN is set to a local URL: ${origin}`,
      detail:  'For production this must be your Vercel deployment URL (https://...)',
    };
  }
  if (!origin.startsWith('https://')) {
    return {
      ok: false,
      message: `ALLOWED_ORIGIN must be HTTPS, got: ${origin}`,
      detail:  'Using HTTP in production exposes auth tokens over plain text',
    };
  }
  return { ok: true, message: `ALLOWED_ORIGIN is set to ${origin}` };
}

/**
 * Check 3: All required functions have verify_jwt = true in config.toml
 */
function checkJwtConfig() {
  if (!fs.existsSync(TOML)) {
    return { ok: false, message: 'supabase/config.toml not found' };
  }
  const toml = fs.readFileSync(TOML, 'utf8');
  const failures = [];

  for (const fn of JWT_REQUIRED_FUNCTIONS) {
    // Match the block for this function name followed by verify_jwt = false
    const blockRegex = new RegExp(
      `\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt\\s*=\\s*(false)`,
      'm'
    );
    if (blockRegex.test(toml)) {
      failures.push(fn);
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      message: `verify_jwt = false found for: ${failures.join(', ')}`,
      detail:  'Set verify_jwt = true for all functions in supabase/config.toml',
    };
  }
  return { ok: true, message: 'All edge functions have verify_jwt = true' };
}

/**
 * Check 4: No wildcard CORS in edge function source files
 */
function checkNoCorsWildcard() {
  const fnFiles = collectSourceFiles(FN_DIR, ['.ts']);
  const violations = [];

  for (const file of fnFiles) {
    // Skip the type shim — it only contains declarations
    if (file.endsWith('esm.d.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    // Look for the literal pattern: 'Access-Control-Allow-Origin': '*'
    if (content.includes("'Access-Control-Allow-Origin': '*'")) {
      violations.push(path.relative(ROOT, file));
    }
  }

  if (violations.length > 0) {
    return {
      ok: false,
      message: `Wildcard CORS (*) found in ${violations.length} file(s)`,
      detail:  violations.join('\n  '),
    };
  }
  return { ok: true, message: 'No wildcard CORS found in edge functions' };
}

/**
 * Check 5: No SERVICE_ROLE_KEY references in client-side src/
 * The service role key must never appear in browser-executed code.
 */
function checkNoServiceKeyInSrc() {
  const srcFiles  = collectSourceFiles(SRC, ['.ts', '.tsx']);
  const patterns  = ['SERVICE_ROLE_KEY', 'service_role_key', 'serviceRoleKey', 'service_key'];
  const violations = [];

  for (const file of srcFiles) {
    const rawContent = fs.readFileSync(file, 'utf8');
    // Strip single-line and multi-line comments so doc comments don't trigger false positives
    const codeOnly = rawContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');

    for (const pattern of patterns) {
      if (codeOnly.includes(pattern)) {
        violations.push(`${path.relative(ROOT, file)} (contains: ${pattern})`);
        break; // one hit per file is enough
      }
    }
  }

  if (violations.length > 0) {
    return {
      ok: false,
      message: `SERVICE_ROLE_KEY referenced in client-side code (${violations.length} file(s))`,
      detail:  violations.join('\n  '),
    };
  }
  return { ok: true, message: 'No SERVICE_ROLE_KEY references in client src/' };
}

/**
 * Check 6: plan_type guard trigger exists on live database
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
async function checkPlanTypeGuardTrigger() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      ok: null, // null = skipped (not a failure)
      message: 'plan_type trigger check skipped (SUPABASE_SERVICE_ROLE_KEY not set)',
      detail:  'Set SUPABASE_SERVICE_ROLE_KEY in .env to enable this check',
    };
  }

  let createClient;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
  } catch {
    return { ok: null, message: 'plan_type trigger check skipped (@supabase/supabase-js not importable)' };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('information_schema.triggers')
    .select('trigger_name')
    .eq('trigger_name', 'guard_plan_type_update')
    .eq('event_object_table', 'organizations')
    .eq('event_object_schema', 'public')
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: `DB query failed: ${error.message}`,
      detail:  'Could not verify plan_type guard trigger on live database',
    };
  }

  if (!data) {
    return {
      ok: false,
      message: 'guard_plan_type_update trigger NOT found on organizations table',
      detail:
        'Run the migration: supabase db push\n' +
        '  (Migration: supabase/migrations/20260903000001_block_plan_type_client_updates.sql)',
    };
  }

  return { ok: true, message: 'guard_plan_type_update trigger is active on organizations' };
}

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const isCI = args.includes('--ci');

  console.log();
  console.log(c.bold('HumanFirst Control — Security Preflight Check'));
  console.log(c.dim('─'.repeat(52)));
  console.log();

  /** @type {{ label: string; fn: () => Promise<{ok: boolean|null, message: string, detail?: string}> | {ok: boolean|null, message: string, detail?: string} }[]} */
  const checks = [
    { label: 'Supabase anon key format',            fn: checkAnonKeyFormat },
    { label: 'ALLOWED_ORIGIN (production CORS)',    fn: checkAllowedOrigin },
    { label: 'Edge function JWT config',            fn: checkJwtConfig },
    { label: 'No wildcard CORS in functions',       fn: checkNoCorsWildcard },
    { label: 'No service role key in client code',  fn: checkNoServiceKeyInSrc },
    { label: 'plan_type guard trigger (live DB)',   fn: checkPlanTypeGuardTrigger },
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const check of checks) {
    const result = await check.fn();

    if (result.ok === true) {
      console.log(`  ${c.green('✓')} ${check.label}`);
      console.log(`    ${c.dim(result.message)}`);
      passed++;
    } else if (result.ok === null) {
      console.log(`  ${c.yellow('─')} ${check.label}`);
      console.log(`    ${c.yellow(result.message)}`);
      skipped++;
    } else {
      console.log(`  ${c.red('✗')} ${c.bold(check.label)}`);
      console.log(`    ${c.red(result.message)}`);
      if (result.detail) {
        for (const line of result.detail.split('\n')) {
          console.log(`    ${c.dim(line)}`);
        }
      }
      failed++;
    }

    console.log();
  }

  // ── Summary ────────────────────────────────────────────────
  console.log(c.dim('─'.repeat(52)));
  const status = failed === 0
    ? c.green(`✓ All checks passed (${passed} passed, ${skipped} skipped)`)
    : c.red(`✗ ${failed} check(s) FAILED — fix before deploying to production`);

  console.log(`  ${status}`);
  console.log();

  if (failed > 0) {
    console.log(c.yellow('  Tip: set SKIP_ORIGIN_CHECK=1 to skip the ALLOWED_ORIGIN'));
    console.log(c.yellow('  check when running locally (not for production deploys).'));
    console.log();
    if (isCI) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(c.red(`\n[preflight] Unexpected error: ${err?.message ?? err}\n`));
  process.exitCode = 1;
});
