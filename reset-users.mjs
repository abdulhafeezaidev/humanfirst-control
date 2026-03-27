/**
 * HumanFirst Control – Reset All Users (Admin + Student)
 * 
 * This script deletes ALL users and their associated data from Supabase
 * so you can start fresh with new admin/student signups.
 * 
 * USAGE:
 *   node reset-users.mjs
 * 
 * You will be prompted for your Supabase SERVICE_ROLE key.
 * Get it from: Supabase Dashboard ? Project Settings ? API ? service_role (secret)
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline';

// ?? Read Supabase URL from .env ?????????????????????????????
import { readFileSync } from 'node:fs';

let supabaseUrl = '';
try {
  const env = readFileSync('.env', 'utf-8');
  const match = env.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\s\n]+)"?/);
  if (match) supabaseUrl = match[1];
} catch { /* ignore */ }

if (!supabaseUrl) {
  console.error('[ERROR] Could not read VITE_SUPABASE_URL from .env');
  process.exit(1);
}

// ?? Prompt for service role key ?????????????????????????????
const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

console.log('');
console.log('============================================');
console.log('  HumanFirst Control – Reset All Users');
console.log('============================================');
console.log('');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('');
console.log('??  This will DELETE ALL users (admin + student) and their data.');
console.log('    After reset, you can sign up fresh from /admin/signup or /auth.');
console.log('');

const serviceRoleKey = await ask('Paste your Supabase SERVICE_ROLE key: ');
if (!serviceRoleKey || serviceRoleKey.trim().length < 20) {
  console.error('[ERROR] Invalid service role key.');
  rl.close();
  process.exit(1);
}

const confirm = await ask('Type "yes" to confirm full user reset: ');
if (confirm.trim().toLowerCase() !== 'yes') {
  console.log('[CANCELLED] No changes made.');
  rl.close();
  process.exit(0);
}

rl.close();

// ?? Connect with service_role ???????????????????????????????
const supabase = createClient(supabaseUrl, serviceRoleKey.trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('');
console.log('[1/4] Clearing application data tables...');

const tablesToClear = [
  'policy_assignment_logs',
  'policy_assignments',
  'blocked_urls',
  'tamper_events',
  'audit_logs',
  'metrics_daily',
  'metrics_monthly',
  'student_invitations',
  'admin_invitations',
  'enforcement_config',
  'exam_policies',
  'rate_limits',
  'user_roles',
  'profiles',
  'organizations',
  'ai_services',
];

for (const table of tablesToClear) {
  const { error } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
  if (error) {
    // Detect paused project
    if (error.message && error.message.includes('paused')) {
      console.log('');
      console.error('? Your Supabase project is PAUSED.');
      console.error('   Go to https://supabase.com/dashboard ? select your project ? click "Restore project"');
      console.error('   Wait ~1 minute, then run this script again.');
      process.exit(1);
    }
    console.log(`  ? ${table}: ${error.message}`);
  } else {
    console.log(`  ? ${table} cleared`);
  }
}

console.log('');
console.log('[2/4] Fetching all auth users...');

let allUsers = [];
let page = 1;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`  [ERROR] ${error.message}`);
    break;
  }
  const batch = data?.users ?? [];
  allUsers.push(...batch);
  if (batch.length < 200) break;
  page++;
}

console.log(`  Found ${allUsers.length} user(s)`);

console.log('');
console.log('[3/4] Deleting auth users...');

for (const user of allUsers) {
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.log(`  ? ${user.email}: ${error.message}`);
  } else {
    console.log(`  ? Deleted: ${user.email} (${user.id})`);
  }
}

console.log('');
console.log('[4/4] Done!');
console.log('');
console.log('============================================');
console.log('  All users have been reset.');
console.log('');
console.log('  Next steps:');
console.log('  1. Launch the app (launch.bat)');
console.log('  2. Go to /admin/signup to create a new admin');
console.log('  3. Go to /auth to create a new student');
console.log('============================================');
console.log('');
