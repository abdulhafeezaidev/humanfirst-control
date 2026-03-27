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
  // Try the exact name first, then VITE_ prefix version
  const value = process.env[name] || process.env[`VITE_${name}`];
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`Missing required env var: ${name} (or VITE_${name})`);
}

// Load .env file if dotenv is available
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (e) {
  // dotenv not installed, rely on process.env
}

async function listAllUsers(adminClient) {
  const users = [];
  let page = 1;
  const perPage = 200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page++;
    if (page > 200) break;
  }

  return users;
}

async function findUserByEmail(adminClient, email) {
  const target = String(email ?? '').trim().toLowerCase();
  if (!target) throw new Error('Missing --email');

  const users = await listAllUsers(adminClient);
  const match = users.find((u) => String(u?.email ?? '').toLowerCase() === target);
  if (!match) throw new Error(`No auth user found for email: ${email}`);
  return match;
}

async function cmdSetRole(supabase, args) {
  const email = args.email;
  const role = args.role;
  if (!email) throw new Error('Usage: set-role --email <email> --role <super_admin|admin|viewer|student>');
  if (!role) throw new Error('Missing --role');

  const user = await findUserByEmail(supabase, email);

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.id, role }, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to upsert user_roles: ${error.message}`);

  console.log('[admin] set role ok:', { email, user_id: user.id, role });
}

async function cmdUpdateAuthEmail(supabase, args) {
  const userId = args.userId || args.uid;
  const email = args.email;
  if (!userId || !email) {
    throw new Error('Usage: update-auth-email --userId <uuid> --email <new-email>');
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to update auth email: ${error.message}`);

  console.log('[admin] updated auth email ok:', { user_id: data?.user?.id, email: data?.user?.email });
}

async function cmdResetAllUsers(supabase, args) {
  const confirm = args.confirm === 'yes' || args.confirm === true;
  
  if (!confirm) {
    console.log('WARNING: This will DELETE ALL USERS and related data!');
    console.log('');
    console.log('This will remove:');
    console.log('  - All auth.users');
    console.log('  - All user_roles');
    console.log('  - All profiles');
    console.log('  - All organizations');
    console.log('  - All admin_invitations');
    console.log('  - All policies and related data');
    console.log('');
    console.log('To proceed, run with --confirm=yes');
    return;
  }

  console.log('[admin] Starting full user reset...');

  // 1. Delete from policy-related tables first (foreign key order)
  const tablesToClear = [
    'blocked_urls',
    'policy_assignments', 
    'policies',
    'tamper_events',
    'admin_invitations',
    'user_roles',
    'profiles',
    'organizations',
  ];

  for (const table of tablesToClear) {
    console.log(`[admin] Clearing table: ${table}...`);
    const { error } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
    if (error) {
      console.warn(`[admin] Warning - could not clear ${table}: ${error.message}`);
    } else {
      console.log(`[admin] Cleared ${table}`);
    }
  }

  // 2. Delete all auth users
  console.log('[admin] Deleting all auth users...');
  const users = await listAllUsers(supabase);
  console.log(`[admin] Found ${users.length} auth users to delete`);

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.warn(`[admin] Failed to delete user ${user.email}: ${error.message}`);
    } else {
      console.log(`[admin] Deleted user: ${user.email}`);
    }
  }

  console.log('[admin] Reset complete! All users and data cleared.');
  console.log('[admin] You can now sign up as a fresh admin.');
}

async function main() {
  const args = parseArgs(process.argv);
  const command = String(args._[0] ?? '');

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!command || command === 'help' || command === '--help') {
    console.log('HumanFirst Supabase Admin CLI');
    console.log('');
    console.log('Commands:');
    console.log('  set-role --email <email> --role <super_admin|admin|viewer|student>');
    console.log('  update-auth-email --userId <uuid> --email <new-email>');
    console.log('  reset-all-users --confirm=yes    (DANGER: deletes ALL users and data)');
    console.log('');
    console.log('Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  if (command === 'set-role') {
    await cmdSetRole(supabase, args);
    return;
  }

  if (command === 'update-auth-email') {
    await cmdUpdateAuthEmail(supabase, args);
    return;
  }

  if (command === 'reset-all-users') {
    await cmdResetAllUsers(supabase, args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => {
  console.error('[admin] FAILED:', err?.message ?? err);
  process.exitCode = 1;
});
