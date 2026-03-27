import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const [key, maybeValue] = a.split('=', 2);
    const name = key.replace(/^--/, '');
    if (maybeValue !== undefined) {
      args[name] = maybeValue;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[name] = next;
      i++;
    } else {
      args[name] = true;
    }
  }
  return args;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  throw new Error(`Missing required env var: ${name}`);
}

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEmail(value) {
  if (value == null) return '';
  // Remove common invisible/control characters that can sneak into exports.
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function remapUserIdsInRow(row, userIdMap) {
  const keysToRemap = new Set([
    'user_id',
    'actor_id',
    'created_by',
    'resolved_by',
    'target_user_id',
    'assigned_by',
    'updated_by',
  ]);

  const out = { ...row };
  for (const [key, value] of Object.entries(out)) {
    if (!keysToRemap.has(key)) continue;
    if (!isUuid(value)) continue;
    const mapped = userIdMap.get(value);
    if (mapped) out[key] = mapped;
  }
  return out;
}

async function chunkedUpsert(supabase, table, rows, { onConflict } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const query = onConflict
      ? supabase.from(table).upsert(chunk, { onConflict, ignoreDuplicates: false })
      : supabase.from(table).insert(chunk);

    const { error } = await query;
    if (error) {
      throw new Error(`Failed to write ${table} (rows ${i}-${i + chunk.length - 1}): ${error.message}`);
    }
  }
}

async function listAllUsersByEmail(adminClient) {
  const byEmail = new Map();

  // New projects are small; this is fine.
  let page = 1;
  const perPage = 200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // supabase-js v2: listUsers({ page, perPage })
    // Returns { data: { users }, error }
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);

    const users = data?.users ?? [];
    for (const u of users) {
      if (u?.email) byEmail.set(String(u.email).toLowerCase(), u);
    }

    if (users.length < perPage) break;
    page++;
    if (page > 200) break; // safety
  }

  return byEmail;
}

async function ensureUsers(adminClient, exportedAuthUsers, { dryRun } = {}) {
  const existingByEmail = await listAllUsersByEmail(adminClient);
  const userIdMap = new Map();

  for (const u of exportedAuthUsers) {
    const email = normalizeEmail(u.email);
    const oldUserId = String(u.user_id ?? '').trim();
    if (!email || !isUuid(oldUserId)) continue;

    const existing = existingByEmail.get(email);
    if (existing?.id) {
      userIdMap.set(oldUserId, existing.id);
      continue;
    }

    if (dryRun) {
      // placeholder mapping not possible; just note missing.
      continue;
    }

    // Prefer invite (sends email). If email sending/validation blocks it, fall back
    // to createUser with a random password so data import can proceed.
    let created = null;

    const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: u.full_name ?? null,
        organization_id: u.organization_id ?? null,
      },
    });

    if (!invite.error && invite.data?.user?.id) {
      created = invite.data.user;
    } else {
      const reason = invite.error?.message ?? 'unknown error';
      console.warn(`[import] inviteUserByEmail failed for ${JSON.stringify(email)}: ${reason}`);
      console.warn('[import] falling back to auth.admin.createUser (no email invite will be sent)');

      const randomPassword = crypto.randomBytes(24).toString('base64url');
      const createdUser = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: u.full_name ?? null,
          organization_id: u.organization_id ?? null,
        },
      });

      if (createdUser.error) {
        throw new Error(`createUser failed for ${JSON.stringify(email)}: ${createdUser.error.message}`);
      }

      if (!createdUser.data?.user?.id) {
        throw new Error(`createUser did not return user id for ${JSON.stringify(email)}`);
      }

      created = createdUser.data.user;
    }

    userIdMap.set(oldUserId, created.id);
    existingByEmail.set(email, created);
  }

  return userIdMap;
}

async function main() {
  const args = parseArgs(process.argv);
  const dryRun = Boolean(args['dry-run'] || args.dryRun);

  const exportDirArg = args.exportDir || args.export || args._[0];
  const exportDir = exportDirArg
    ? path.resolve(exportDirArg)
    : path.resolve('exports');

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  const schemaPath = path.join(exportDir, 'schema.sql');
  const authUsersPath = path.join(exportDir, 'auth_users.json');
  const dataDir = path.join(exportDir, 'data');

  if (!(await exists(schemaPath))) {
    throw new Error(`Missing schema.sql at: ${schemaPath}`);
  }
  if (!(await exists(authUsersPath))) {
    throw new Error(`Missing auth_users.json at: ${authUsersPath}`);
  }
  if (!(await exists(dataDir))) {
    throw new Error(`Missing data/ folder at: ${dataDir}`);
  }

  console.log('[import] exportDir:', exportDir);
  console.log('[import] dryRun:', dryRun);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const exportedAuthUsers = await readJson(authUsersPath);
  if (!Array.isArray(exportedAuthUsers)) {
    throw new Error('auth_users.json must be a JSON array');
  }

  console.log(`[import] exported auth users: ${exportedAuthUsers.length}`);

  console.log('[import] ensuring users exist in NEW project (by email)...');
  const userIdMap = await ensureUsers(supabase, exportedAuthUsers, { dryRun });
  console.log(`[import] user_id mappings: ${userIdMap.size}`);

  const mapOutPath = path.join(exportDir, 'user_id_map.json');
  if (!dryRun) {
    await fs.writeFile(mapOutPath, JSON.stringify(Object.fromEntries(userIdMap), null, 2), 'utf8');
    console.log('[import] wrote user id map:', mapOutPath);
  } else {
    console.log('[import] (dry-run) would write user id map:', mapOutPath);
  }

  const tableOrder = [
    'organizations',
    'profiles',
    'user_roles',
    'exam_policies',
    'policy_assignments',
    'blocked_urls',
    'enforcement_config',
    'ai_services',
    'tamper_events',
    'audit_logs',
    'admin_invitations',
    'student_invitations',
    'policy_assignment_logs',
    'metrics_daily',
    'metrics_monthly',
  ];

  const onlyTables = typeof args.only === 'string' && args.only.trim().length > 0
    ? new Set(args.only.split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  for (const table of tableOrder) {
    if (onlyTables && !onlyTables.has(table)) continue;

    const filePath = path.join(dataDir, `${table}.json`);
    if (!(await exists(filePath))) {
      console.log(`[import] skip ${table} (missing ${table}.json)`);
      continue;
    }

    const rows = await readJson(filePath);
    if (!Array.isArray(rows)) {
      throw new Error(`${table}.json must be a JSON array`);
    }

    const mappedRows = rows.map((r) => remapUserIdsInRow(r, userIdMap));

    console.log(`[import] ${table}: ${mappedRows.length} row(s)`);
    if (dryRun) continue;

    const useIdUpsert = mappedRows.length > 0 && mappedRows.every((r) => typeof r === 'object' && r !== null && 'id' in r);
    await chunkedUpsert(supabase, table, mappedRows, useIdUpsert ? { onConflict: 'id' } : undefined);
  }

  console.log('[import] done');
  console.log('[import] next: send password reset/invite emails to users, then update app env vars to point to the new project.');
}

main().catch((err) => {
  console.error('[import] FAILED:', err?.message ?? err);
  // Avoid hard process.exit() here: supabase-js / undici may still have handles
  // in-flight, and forced exit can trigger libuv assertions on Windows.
  process.exitCode = 1;
});
