type SupabaseFrontendConfig = {
  url: string;
  anonKey: string;
};

function required(name: string, value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  throw new Error(
    `[Supabase] Missing required env var: ${name}. ` +
      `Set it in your .env (see .env.example) and restart the dev server.`
  );
}

/**
 * Frontend-safe Supabase config (URL + anon key only).
 *
 * Note: this repo historically used VITE_SUPABASE_PUBLISHABLE_KEY for the anon key.
 * We prefer VITE_SUPABASE_ANON_KEY going forward, but keep backward-compat.
 */
export function getSupabaseFrontendConfig(): SupabaseFrontendConfig {
  const url = required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
  const anonKey = required(
    'VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)',
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  return { url, anonKey };
}

export const supabaseUrl = getSupabaseFrontendConfig().url;
export const supabaseAnonKey = getSupabaseFrontendConfig().anonKey;
