/**
 * ESM.sh TypeScript shim for Supabase Edge Functions (Deno runtime)
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * Supabase Edge Functions run on Deno, which imports packages using HTTP URLs:
 *   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
 *
 * The Node.js TypeScript compiler (tsc) used by the IDE doesn't understand
 * HTTP imports — it only knows npm packages from node_modules/.
 *
 * This file declares those URL modules as type aliases to the npm package
 * already installed in node_modules/, so the IDE stops reporting errors.
 *
 * THE CODE IS CORRECT — it works on Deno in production. This shim is
 * purely for local IDE type-checking and has zero runtime effect.
 *
 * ALTERNATIVE (long-term)
 * ───────────────────────
 * Install the Deno VS Code extension (denoland.vscode-deno) and configure
 * .vscode/settings.json with "deno.enablePaths": ["supabase/functions"].
 * That makes the Deno language server handle these files natively.
 */

// supabase-js v2.38.x
declare module 'https://esm.sh/@supabase/supabase-js@2.38.4' {
  export * from '@supabase/supabase-js';
}

// supabase-js v2.39.x
declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js';
}

// supabase-js v2.49.x
declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  export * from '@supabase/supabase-js';
}

// ─────────────────────────────────────────────────────────────────────────────
// Deno global namespace shim
//
// The Node TypeScript compiler has no knowledge of the Deno runtime globals.
// This declares the subset of the Deno API actually used across this codebase:
//   • Deno.env.get()  — reads environment variables (secrets, config)
//   • Deno.serve()    — starts the HTTP server that handles incoming requests
//
// These declarations are accurate against the real Deno API. Add more entries
// here if new Deno APIs are used in future edge functions.
// ─────────────────────────────────────────────────────────────────────────────
declare namespace Deno {
  /** Read-only access to environment variables / Supabase secrets. */
  const env: {
    /** Returns the value of the env var, or undefined if not set. */
    get(key: string): string | undefined;
  };

  /**
   * Starts the Deno HTTP server.
   * Every Edge Function's entry point calls this with an async handler.
   */
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: {
      port?: number;
      hostname?: string;
      signal?: AbortSignal;
      onListen?: (params: { hostname: string; port: number }) => void;
    }
  ): Promise<void>;
}
