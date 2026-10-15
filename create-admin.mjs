/**
 * HumanFirst Control — Create Administrator User
 *
 * Creates or updates an admin/super_admin user in Supabase with:
 * - Auth credentials (email, password, email confirmed)
 * - Organization setup (or linking to existing organization)
 * - Super Admin role assignment in `user_roles`
 * - Profile with organization link and ethics accepted
 * - Enforcement configuration
 *
 * USAGE:
 *   node create-admin.mjs
 *   node create-admin.mjs --key=YOUR_SERVICE_ROLE_KEY
 *   node create-admin.mjs --email=admin@gmail.com --password=admin1234
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// ── Parse CLI arguments ───────────────────────────────────────
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
HumanFirst Control — Create Administrator Script

Usage:
  node create-admin.mjs
  node create-admin.mjs --key=YOUR_SERVICE_ROLE_KEY
  node create-admin.mjs --email=admin@gmail.com --password=admin1234 --key=YOUR_SERVICE_ROLE_KEY

Options:
  --key, --service-role-key  Supabase secret service_role key
  --email                    Admin email (default: admin@gmail.com)
  --password                 Admin password (default: admin1234)
  --name                     Full name (default: Administrator)
  --org                      Organization name (default: HumanFirst Control Org)
  --slug                     Organization slug (default: humanfirst-org)
  --role                     Role to assign (default: super_admin)
  --help, -h                 Show this help message
`);
  process.exit(0);
}

function getArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const argKey = getArg('key') || getArg('service-role-key');
const argEmail = getArg('email') || 'admin@gmail.com';
const argPassword = getArg('password') || 'admin1234';
const argFullName = getArg('name') || 'Administrator';
const argOrgName = getArg('org') || 'HumanFirst Control Org';
const argOrgSlug = getArg('slug') || 'humanfirst-org';
const argRole = getArg('role') || 'super_admin';

// ── Read Supabase URL from .env ──────────────────────────────
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!supabaseUrl) {
  try {
    const env = readFileSync('.env', 'utf-8');
    const match = env.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\s\n]+)"?/);
    if (match) supabaseUrl = match[1];
  } catch { /* ignore */ }
}

if (!supabaseUrl) {
  console.error('[ERROR] Could not read VITE_SUPABASE_URL from .env');
  process.exit(1);
}

// ── Prompt for Service Role Key if not provided ───────────────
let serviceRoleKey = argKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey || serviceRoleKey.trim().length < 20) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log('');
  console.log('============================================');
  console.log('  HumanFirst Control — Create Administrator');
  console.log('============================================');
  console.log('');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('');
  console.log('To insert an admin directly into the database, the Supabase');
  console.log('SERVICE_ROLE key is required (found in Supabase Dashboard -> Project Settings -> API).');
  console.log('');

  const inputKey = await ask('Paste your Supabase SERVICE_ROLE key: ');
  rl.close();

  serviceRoleKey = inputKey.trim();
}

if (!serviceRoleKey || serviceRoleKey.length < 20) {
  console.error('[ERROR] Invalid or missing service role key.');
  process.exit(1);
}

// ── Initialize Supabase Admin Client ──────────────────────────
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('');
console.log(`[1/5] Checking auth user: ${argEmail} ...`);

let userId = null;

// Check if user already exists
const { data: userListData, error: listError } = await supabase.auth.admin.listUsers();
if (!listError && userListData?.users) {
  const existingUser = userListData.users.find(
    (u) => u.email?.toLowerCase() === argEmail.toLowerCase()
  );
  if (existingUser) {
    userId = existingUser.id;
    console.log(`  ℹ Found existing auth user: ${userId}`);
    console.log(`  Updating password and confirming email...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: argPassword,
      email_confirm: true,
      user_metadata: { full_name: argFullName },
    });
    if (updateError) {
      console.error(`  [ERROR] Failed to update existing user: ${updateError.message}`);
      process.exit(1);
    }
    console.log(`  ✔ Existing user credentials updated`);
  }
}

// If user does not exist, create new user
if (!userId) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: argEmail,
    password: argPassword,
    email_confirm: true,
    user_metadata: { full_name: argFullName },
  });

  if (authError) {
    console.error(`[ERROR] Failed to create auth user: ${authError.message}`);
    process.exit(1);
  }
  userId = authData.user.id;
  console.log(`  ✔ Auth user created: ${userId}`);
}

// ── Ensure Organization Exists ────────────────────────────────
console.log('[2/5] Setting up organization...');

let organizationId = null;

// Check if any organization exists
const { data: existingOrgs, error: orgFetchError } = await supabase
  .from('organizations')
  .select('id, name, slug')
  .limit(1);

if (!orgFetchError && existingOrgs && existingOrgs.length > 0) {
  organizationId = existingOrgs[0].id;
  console.log(`  ✔ Using existing organization: "${existingOrgs[0].name}" (${organizationId})`);
} else {
  // Create default organization
  const { data: newOrg, error: createOrgError } = await supabase
    .from('organizations')
    .insert({
      name: argOrgName,
      slug: argOrgSlug,
      plan_type: 'pilot',
    })
    .select('id')
    .single();

  if (createOrgError) {
    console.warn(`  [WARN] Could not create organization: ${createOrgError.message}`);
  } else {
    organizationId = newOrg.id;
    console.log(`  ✔ Created organization: "${argOrgName}" (${organizationId})`);
  }
}

// ── Assign Role in user_roles ─────────────────────────────────
console.log(`[3/5] Assigning "${argRole}" role in user_roles...`);

// Delete any default role inserted by triggers, then insert target role
await supabase.from('user_roles').delete().eq('user_id', userId);

const { error: roleError } = await supabase
  .from('user_roles')
  .insert({ user_id: userId, role: argRole });

if (roleError) {
  console.error(`  [ERROR] Could not assign role: ${roleError.message}`);
} else {
  console.log(`  ✔ Role "${argRole}" assigned successfully`);
}

// ── Create or Update Profile ──────────────────────────────────
console.log('[4/5] Setting up profile & ethics agreement...');

const profilePayload = {
  user_id: userId,
  email: argEmail,
  full_name: argFullName,
  ethics_accepted_at: new Date().toISOString(),
};

if (organizationId) {
  profilePayload.organization_id = organizationId;
}

const { error: profileError } = await supabase
  .from('profiles')
  .upsert(profilePayload, { onConflict: 'user_id' });

if (profileError) {
  console.error(`  [ERROR] Could not upsert profile: ${profileError.message}`);
} else {
  console.log('  ✔ Profile updated with organization link and ethics accepted');
}

// ── Ensure Enforcement Config ─────────────────────────────────
console.log('[5/5] Ensuring enforcement configuration...');

if (organizationId) {
  const { data: existingConfig } = await supabase
    .from('enforcement_config')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!existingConfig) {
    const { error: configError } = await supabase
      .from('enforcement_config')
      .insert({
        organization_id: organizationId,
        status: 'not_connected',
        pilot_mode: true,
      });

    if (configError) {
      console.warn(`  [WARN] Could not create enforcement config: ${configError.message}`);
    } else {
      console.log('  ✔ Enforcement config initialized');
    }
  } else {
    console.log('  ✔ Enforcement config already exists');
  }
}

console.log('');
console.log('============================================');
console.log('  🎉 Administrator account ready!');
console.log('============================================');
console.log('');
console.log(`  Email:         ${argEmail}`);
console.log(`  Password:      ${argPassword}`);
console.log(`  Role:          ${argRole}`);
console.log(`  Full Name:     ${argFullName}`);
console.log(`  Organization:  ${organizationId || 'None'}`);
console.log('');
console.log('  How to login:');
console.log('  1. Open the app (e.g. at http://localhost:8080 or your Vercel deployment)');
console.log('  2. Go to /auth');
console.log('  3. Select "Administrator"');
console.log(`  4. Enter ${argEmail} and your password`);
console.log('============================================');
console.log('');
