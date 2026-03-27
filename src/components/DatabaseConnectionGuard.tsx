import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";

/**
 * Monitors database connectivity and renders a sticky banner whenever
 * the Supabase backend is unreachable.  When connected, renders nothing.
 *
 * Usage: place once near the root of the component tree (e.g. in App.tsx).
 */
export function DatabaseConnectionGuard() {
  const { status, retry } = useSupabaseConnection();

  if (status === "connected") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium shadow-lg transition-colors ${
        status === "checking"
          ? "bg-yellow-500/90 text-yellow-950"
          : "bg-destructive text-destructive-foreground"
      }`}
    >
      {status === "checking" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting to database…
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Database connection lost.
          <button
            onClick={retry}
            className="ml-2 inline-flex items-center gap-1 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            <Wifi className="h-3 w-3" />
            Retry
          </button>
        </>
      )}
    </div>
  );
}
