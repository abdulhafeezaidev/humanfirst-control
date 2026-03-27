/**
 * HumanFirst Control – Create Student User
 *
 * Creates a student user with email-confirmed status and assigns the 'student' role.
 *
 * USAGE:  node create-student.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// ?? Read Supabase URL from .env ?????????????????????????????
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
function ask(q) { return new Promise((resolve) => rl.question(q, resolve)); }

console.log('');
console.log('============================================');
console.log('  HumanFirst Control – Create Student');
console.log('============================================');
console.log('');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('');

const serviceRoleKey = await ask('Paste your Supabase SERVICE_ROLE key: ');
if (!serviceRoleKey || serviceRoleKey.trim().length < 20) {
  console.error('[ERROR] Invalid service role key.');
  rl.close();
  process.exit(1);
}
rl.close();

const supabase = createClient(supabaseUrl, serviceRoleKey.trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = 'azmirza4533@gmail.com';
const PASSWORD = 'H@fEeZ736!';
const FULL_NAME = 'Student User';

console.log('');
console.log(`[1/3] Creating auth user: ${EMAIL} ...`);

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: FULL_NAME },
});

if (authError) {
  console.error(`[ERROR] Failed to create auth user: ${authError.message}`);
  process.exit(1);
}

const userId = authData.user.id;
console.log(`  ? Auth user created: ${userId}`);

console.log('[2/3] Assigning student role...');

const { error: roleError } = await supabase
  .from('user_roles')
  .upsert({ user_id: userId, role: 'student' }, { onConflict: 'user_id' });

if (roleError) {
  console.error(`  ? Could not assign role: ${roleError.message}`);
} else {
  console.log('  ? Role "student" assigned');
}

console.log('[3/3] Creating profile...');

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    user_id: userId,
    email: EMAIL,
    full_name: FULL_NAME,
  }, { onConflict: 'user_id' });

if (profileError) {
  console.error(`  ? Could not create profile: ${profileError.message}`);
} else {
  console.log('  ? Profile created');
}

console.log('');
console.log('============================================');
console.log('  Student account created successfully!');
console.log('');
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Role:     student`);
console.log('');
console.log('  Login at /auth and select "Student"');
console.log('============================================');
console.log('');
